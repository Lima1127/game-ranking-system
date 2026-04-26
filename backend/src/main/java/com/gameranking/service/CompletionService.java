package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.scoring.ScoringEngine;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CompletionListItemResponse;
import com.gameranking.web.dto.completion.CompletionRequestResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompletionService {

    private final CompletionRepository completionRepository;
    private final EditionRepository editionRepository;
    private final UserRepository userRepository;
    private final GameService gameService;
    private final ScoreEventRepository scoreEventRepository;
    private final ScoringEngine scoringEngine;
    private final PlatinumProofService platinumProofService;
    private final AdminAuditLogService adminAuditLogService;
    private final ObligationService obligationService;
    private final RotativeListService rotativeListService;

    @Transactional
    public CompletionResponse create(UUID userId, CreateCompletionRequest request) {
        Edition edition = editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        Game game = gameService.getById(request.gameId());

        if (completionRepository.existsByUserIdAndGameId(user.getId(), game.getId())) {
            throw new BusinessException("Voce ja registrou uma conclusao para este jogo");
        }

        if (request.platinumProofId() == null) {
            throw new BusinessException("Toda solicitacao exige um anexo");
        }

        if (!request.coop() && request.coopPlayers() != null) {
            throw new BusinessException("Quantidade de jogadores cooperativos so deve ser informada quando coop for verdadeiro");
        }

        if (request.coop() && request.coopPlayers() == null) {
            throw new BusinessException("Informe quantidade de jogadores para cooperativo");
        }

        Completion completion = Completion.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .user(user)
                .game(game)
                .completedAt(request.completedAt() == null ? LocalDate.now() : request.completedAt())
                .hoursPlayed(request.hoursPlayed())
                .firstTimeEver(request.firstTimeEver())
                .firstInEdition(false)
                .underdogAwarded(false)
                .completedInReleaseYear(request.completedInReleaseYear())
                .platinum(request.platinum())
                .coop(request.coop())
                .coopPlayers(request.coopPlayers())
                .hypeParticipation(request.hypeParticipation())
                .hypeCompletedBonus(request.hypeCompletedBonus())
                .rotativeList(request.rotativeList() || rotativeListService.isGameInActiveList(edition.getId(), game.getId()))
                .notes(request.notes())
                .status(CompletionStatus.PENDING)
                .build();

        Completion saved = completionRepository.save(completion);

        platinumProofService.attachToCompletion(request.platinumProofId(), saved);

        return new CompletionResponse(saved.getId(), user.getId(), game.getId(), 0, CompletionStatus.PENDING);
    }

    @Transactional
    public CompletionResponse updatePending(UUID requesterId, UUID completionId, CreateCompletionRequest request) {
        Edition edition = resolveEdition(null);
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        Completion completion = completionRepository.findByIdAndEditionId(completionId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao nao encontrada"));

        boolean ownsRequest = completion.getUser().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRequest && !isAdmin) {
            throw new BusinessException("Voce nao pode editar esta solicitacao");
        }

        if (completion.getStatus() != CompletionStatus.PENDING) {
            throw new BusinessException("Apenas solicitacoes pendentes podem ser editadas");
        }

        if (request.platinumProofId() == null) {
            throw new BusinessException("Toda solicitacao exige um anexo");
        }

        if (!request.coop() && request.coopPlayers() != null) {
            throw new BusinessException("Quantidade de jogadores cooperativos so deve ser informada quando coop for verdadeiro");
        }

        if (request.coop() && request.coopPlayers() == null) {
            throw new BusinessException("Informe quantidade de jogadores para cooperativo");
        }

        Game game = gameService.getById(request.gameId());
        completion.setGame(game);
        completion.setCompletedAt(request.completedAt() == null ? LocalDate.now() : request.completedAt());
        completion.setHoursPlayed(request.hoursPlayed());
        completion.setFirstTimeEver(request.firstTimeEver());
        completion.setCompletedInReleaseYear(request.completedInReleaseYear());
        completion.setPlatinum(request.platinum());
        completion.setCoop(request.coop());
        completion.setCoopPlayers(request.coopPlayers());
        completion.setHypeParticipation(request.hypeParticipation());
        completion.setHypeCompletedBonus(request.hypeCompletedBonus());
        completion.setRotativeList(request.rotativeList() || rotativeListService.isGameInActiveList(edition.getId(), game.getId()));
        completion.setNotes(request.notes());

        if (completion.getProof() == null) {
            platinumProofService.attachToCompletion(request.platinumProofId(), completion);
        } else if (!completion.getProof().getId().equals(request.platinumProofId())) {
            platinumProofService.replaceCompletionProof(request.platinumProofId(), completion);
        }

        return new CompletionResponse(completion.getId(), completion.getUser().getId(), completion.getGame().getId(), 0, completion.getStatus());
    }

    @Transactional(readOnly = true)
    public List<CompletionListItemResponse> list(UUID editionId) {
        UUID effectiveEditionId = editionId;
        if (effectiveEditionId == null) {
            effectiveEditionId = editionRepository.findByActiveTrue()
                    .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"))
                    .getId();
        }

        List<CompletionListItemResponse> completions = completionRepository.listByEditionId(effectiveEditionId);
        if (completions.isEmpty()) {
            return completions;
        }

        List<UUID> completionIds = completions.stream()
                .map(CompletionListItemResponse::completionId)
                .toList();

        Map<UUID, List<String>> ruleCodesByCompletionId = new LinkedHashMap<>();
        scoreEventRepository.listRuleCodesByCompletionIds(completionIds).forEach(projection ->
                ruleCodesByCompletionId
                        .computeIfAbsent(projection.getCompletionId(), ignored -> new java.util.ArrayList<>())
                        .add(projection.getRuleCode())
        );

        return completions.stream()
                .map(completion -> new CompletionListItemResponse(
                        completion.completionId(),
                        completion.userId(),
                        completion.userDisplayName(),
                        completion.gameId(),
                        completion.gameName(),
                        completion.completedAt(),
                        completion.hoursPlayed(),
                        completion.platinum(),
                        ruleCodesByCompletionId.getOrDefault(completion.completionId(), Collections.emptyList())
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CompletionRequestResponse> listRequests(UUID requesterId, UUID editionId) {
        Edition edition = resolveEdition(editionId);
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (requester.getRole() == UserRole.ADMIN) {
            return completionRepository.listRequestsByEditionId(edition.getId());
        }

        return completionRepository.listRequestsByEditionIdAndUserId(edition.getId(), requesterId);
    }

    @Transactional
    public CompletionResponse approve(UUID approverId, UUID completionId) {
        Edition edition = resolveEdition(null);
        User approver = userRepository.findById(approverId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (approver.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Apenas usuarios ADMIN podem aprovar solicitacoes");
        }

        Completion completion = completionRepository.findByIdAndEditionId(completionId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao nao encontrada"));

        if (completion.getStatus() != CompletionStatus.PENDING) {
            throw new BusinessException("A solicitacao nao esta pendente");
        }

        boolean firstInEdition = !completionRepository.existsByEditionIdAndGameIdAndStatus(
                edition.getId(),
                completion.getGame().getId(),
                CompletionStatus.APPROVED
        );

        completion.setFirstInEdition(firstInEdition);
        completion.setStatus(CompletionStatus.APPROVED);
        completion.setApprovedBy(approver);
        completion.setApprovedAt(java.time.OffsetDateTime.now());

        Long userCurrentScore = scoreEventRepository.getTotalPointsForUser(edition.getId(), completion.getUser().getId());
        Long leaderScore = scoreEventRepository.getRanking(edition.getId()).stream()
                .mapToLong(row -> row.totalPoints() == null ? 0L : row.totalPoints())
                .max()
                .orElse(0L);
        boolean underdogBonus = leaderScore - (userCurrentScore == null ? 0L : userCurrentScore) >= 20;
        completion.setUnderdogAwarded(underdogBonus);
        boolean rotativeConsumed = rotativeListService.consumeIfActive(edition.getId(), completion.getGame().getId());
        completion.setRotativeList(rotativeConsumed);

        List<ScoreEvent> events = scoringEngine.buildCompletionEvents(completion, edition, completion.getUser(), underdogBonus);
        scoreEventRepository.saveAll(events);
        obligationService.resolveWithApprovedCompletion(completion);

        int total = events.stream().mapToInt(ScoreEvent::getPoints).sum();
        adminAuditLogService.log(
                approver,
                "REQUEST_APPROVED",
                completion,
                "Solicitacao aprovada pelo admin. Pontos gerados: " + total + "."
        );
        return new CompletionResponse(completion.getId(), completion.getUser().getId(), completion.getGame().getId(), total, completion.getStatus());
    }

    @Transactional
    public CompletionResponse cancel(UUID requesterId, UUID completionId) {
        Edition edition = resolveEdition(null);
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        Completion completion = completionRepository.findByIdAndEditionId(completionId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao nao encontrada"));

        boolean ownsRequest = completion.getUser().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRequest && !isAdmin) {
            throw new BusinessException("Voce nao pode cancelar esta solicitacao");
        }

        if (completion.getStatus() != CompletionStatus.PENDING) {
            throw new BusinessException("Apenas solicitacoes pendentes podem ser canceladas");
        }

        completion.setStatus(CompletionStatus.CANCELLED);
        completion.setCancelledAt(java.time.OffsetDateTime.now());
        adminAuditLogService.log(
                requester,
                "REQUEST_CANCELLED",
                completion,
                isAdmin
                        ? "Solicitacao cancelada por um admin."
                        : "Solicitacao cancelada pelo proprio usuario."
        );

        return new CompletionResponse(completion.getId(), completion.getUser().getId(), completion.getGame().getId(), 0, completion.getStatus());
    }

    private Edition resolveEdition(UUID editionId) {
        if (editionId != null) {
            return editionRepository.findById(editionId)
                    .orElseThrow(() -> new NotFoundException("Edicao nao encontrada"));
        }

        return editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));
    }
}
