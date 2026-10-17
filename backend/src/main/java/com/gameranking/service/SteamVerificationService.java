package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.SteamCheckStatus;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.CompletionSteamCheck;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.CompletionSteamCheckRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamPlayerGameData;
import com.gameranking.service.steam.SteamWebApiClient;
import com.gameranking.web.dto.completion.CompletionSteamCheckResponse;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.task.TaskExecutor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Executor;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Confere na Steam as horas e conquistas do jogo de um registro e guarda o resultado
 * (CompletionSteamCheck) para o admin comparar com o que o jogador declarou.
 *
 * E so evidencia: nunca altera pontos. Quem decide continua sendo o admin, na aprovacao.
 * A consulta a Steam acontece fora de transacao (pode levar alguns segundos e nao deve
 * segurar conexao do banco) e qualquer falha vira um status, sem atrapalhar o registro.
 */
@Slf4j
@Service
public class SteamVerificationService {

    static final int MAX_IDS_PER_LIST = 200;

    private record Target(String steamId, Integer steamAppId) {
    }

    private final CompletionRepository completionRepository;
    private final CompletionSteamCheckRepository checkRepository;
    private final UserRepository userRepository;
    private final SteamWebApiClient steamWebApiClient;
    private final TransactionTemplate transaction;
    private final Executor executor;
    // Registros com conferencia em andamento agora (evita duas consultas gravando a mesma linha).
    private final Set<UUID> inFlight = ConcurrentHashMap.newKeySet();

    public SteamVerificationService(
            CompletionRepository completionRepository,
            CompletionSteamCheckRepository checkRepository,
            UserRepository userRepository,
            SteamWebApiClient steamWebApiClient,
            PlatformTransactionManager transactionManager,
            TaskExecutor taskExecutor
    ) {
        this.completionRepository = completionRepository;
        this.checkRepository = checkRepository;
        this.userRepository = userRepository;
        this.steamWebApiClient = steamWebApiClient;
        this.transaction = new TransactionTemplate(transactionManager);
        this.transaction.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        this.executor = taskExecutor;
    }

    /**
     * Agenda a conferencia dos registros para depois que eles estiverem salvos no banco,
     * em segundo plano: o envio do jogador nao espera a Steam responder.
     */
    public void verifyAfterCommit(Collection<UUID> completionIds) {
        List<UUID> ids = List.copyOf(completionIds);
        Runnable startVerification = () -> executor.execute(() -> ids.forEach(this::refreshQuietly));

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    startVerification.run();
                }
            });
        } else {
            startVerification.run();
        }
    }

    /** Consulta a Steam agora e guarda o resultado no lugar da conferencia anterior. */
    public CompletionSteamCheck refresh(UUID completionId) {
        Target target = transaction.execute(status -> {
            Completion completion = completionRepository.findById(completionId)
                    .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));
            return new Target(completion.getUser().getSteamId(), completion.getGame().getSteamAppId());
        });

        SteamPlayerGameData data;
        if (target.steamAppId() == null) {
            data = SteamPlayerGameData.of(SteamCheckStatus.NO_STEAM_GAME);
        } else if (target.steamId() == null) {
            data = SteamPlayerGameData.of(SteamCheckStatus.NO_STEAM_ACCOUNT);
        } else {
            data = steamWebApiClient.fetch(target.steamId(), target.steamAppId());
        }

        return transaction.execute(status -> checkRepository.save(CompletionSteamCheck.builder()
                .completionId(completionId)
                .status(data.status())
                .steamId(target.steamId())
                .steamAppId(target.steamAppId())
                .playtimeMinutes(data.playtimeMinutes())
                .achievementsTotal(data.achievementsTotal())
                .achievementsUnlocked(data.achievementsUnlocked())
                .lastUnlockAt(data.lastUnlockAt())
                .checkedAt(OffsetDateTime.now())
                .build()));
    }

    /** "Conferir de novo" (ex.: depois que o jogador deixou o perfil publico). Dono do registro ou equipe. */
    public CompletionSteamCheckResponse refreshFor(UUID requesterId, UUID completionId) {
        transaction.execute(status -> {
            Completion completion = completionRepository.findById(completionId)
                    .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));
            if (!canSee(findUser(requesterId), completion)) {
                throw new BusinessException("Voce nao pode conferir este registro");
            }
            return null;
        });
        // Se a conferencia automatica deste registro ainda estiver rodando, nao dispara outra:
        // as duas tentariam gravar a mesma linha ao mesmo tempo. A tela busca o resultado em seguida.
        if (inFlight.add(completionId)) {
            try {
                refresh(completionId);
            } finally {
                inFlight.remove(completionId);
            }
        }
        return list(requesterId, List.of(completionId)).stream().findFirst()
                .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));
    }

    /**
     * Conferencias dos registros pedidos que o usuario pode ver (os proprios; a equipe ve todos).
     *
     * Registro pendente ainda nao conferido, ou conferido quando faltava algo que agora existe
     * (chave da API, conta Steam do jogador, vinculo do jogo com a Steam), e conferido de novo
     * sozinho, em segundo plano; ate la ele volta sem status ("ainda nao conferido").
     */
    public List<CompletionSteamCheckResponse> list(UUID requesterId, List<UUID> completionIds) {
        if (completionIds == null || completionIds.isEmpty()) {
            return List.of();
        }
        if (completionIds.size() > MAX_IDS_PER_LIST) {
            throw new BusinessException("Peca no maximo " + MAX_IDS_PER_LIST + " registros por vez");
        }

        List<UUID> toVerify = new ArrayList<>();
        List<CompletionSteamCheckResponse> responses = transaction.execute(status -> {
            User requester = findUser(requesterId);
            Map<UUID, CompletionSteamCheck> checks = checkRepository.findAllById(completionIds).stream()
                    .collect(Collectors.toMap(CompletionSteamCheck::getCompletionId, Function.identity()));

            return completionRepository.findAllById(completionIds).stream()
                    .filter(completion -> canSee(requester, completion))
                    .map(completion -> {
                        CompletionSteamCheck check = checks.get(completion.getId());
                        if (needsAutomaticCheck(completion, check)) {
                            toVerify.add(completion.getId());
                            return toResponse(completion, null);
                        }
                        return toResponse(completion, check);
                    })
                    .toList();
        });

        if (!toVerify.isEmpty()) {
            executor.execute(() -> toVerify.forEach(this::refreshQuietly));
        }
        return responses;
    }

    private boolean needsAutomaticCheck(Completion completion, CompletionSteamCheck check) {
        if (completion.getStatus() != CompletionStatus.PENDING) {
            return false;
        }
        if (check == null) {
            return true;
        }
        return switch (check.getStatus()) {
            case NOT_CONFIGURED -> steamWebApiClient.isConfigured();
            case NO_STEAM_ACCOUNT -> completion.getUser().getSteamId() != null;
            case NO_STEAM_GAME -> completion.getGame().getSteamAppId() != null;
            default -> false;
        };
    }

    /** Roda a conferencia em segundo plano; se ja houver uma deste registro em andamento, nao repete. */
    private void refreshQuietly(UUID completionId) {
        if (!inFlight.add(completionId)) {
            return;
        }
        try {
            refresh(completionId);
        } catch (RuntimeException ex) {
            log.warn("Conferencia na Steam do registro {} falhou ({})", completionId, ex.getClass().getSimpleName());
        } finally {
            inFlight.remove(completionId);
        }
    }

    private static boolean canSee(User requester, Completion completion) {
        return requester.getRole().isStaff() || completion.getUser().getId().equals(requester.getId());
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId).orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }

    private static CompletionSteamCheckResponse toResponse(Completion completion, CompletionSteamCheck check) {
        return new CompletionSteamCheckResponse(
                completion.getId(),
                check == null ? null : check.getStatus(),
                check == null ? null : check.getSteamId(),
                check == null ? null : check.getSteamAppId(),
                check == null ? null : check.getPlaytimeMinutes(),
                check == null ? null : check.getAchievementsTotal(),
                check == null ? null : check.getAchievementsUnlocked(),
                check == null ? null : check.getLastUnlockAt(),
                check == null ? null : check.getCheckedAt(),
                completion.getEdition().getStartsAt(),
                SteamPlatinumPreviewService.MIN_ACHIEVEMENTS_FOR_PLATINUM
        );
    }
}
