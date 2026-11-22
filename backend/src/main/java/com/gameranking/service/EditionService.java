package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.CompletionUpdateStatus;
import com.gameranking.domain.enums.ObligationStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Obligation;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.CompletionUpdateRequestRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ObligationRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.edition.EditionResponse;
import com.gameranking.web.dto.edition.EditionRolloverPreviewResponse;
import com.gameranking.web.dto.edition.EditionRolloverRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Virada de edicao (decidido em 21/11/2026):
 * <ul>
 *   <li>So o Fundador faz a virada, pela tela Admin → Virada de edicao.</li>
 *   <li>Bloqueia enquanto houver pedido de registro, pedido de atualizacao ou obrigacao em revisao
 *       pendentes na edicao atual: a equipe precisa resolver tudo antes.</li>
 *   <li>Obrigacoes abertas (pendentes/aceitas) sao encerradas como CANCELADAS, sem penalidade.
 *       Os pontos da edicao antiga nao sao alterados: o ranking dela fica congelado.</li>
 *   <li>A edicao antiga fica inativa (so consulta) e a nova vira a ativa. Os pontos comecam do zero
 *       porque tudo (ranking, obrigacoes, lista rotativa) e separado por edicao.</li>
 * </ul>
 */
@Service
@RequiredArgsConstructor
public class EditionService {

    static final List<ObligationStatus> UNDER_REVIEW = List.of(
            ObligationStatus.REVIEW_PENDING_PARTIAL,
            ObligationStatus.REVIEW_PENDING_COMPLETION
    );
    static final List<ObligationStatus> OPEN_TO_CLOSE = List.of(
            ObligationStatus.PENDING,
            ObligationStatus.ACCEPTED
    );

    private final EditionRepository editionRepository;
    private final CompletionRepository completionRepository;
    private final CompletionUpdateRequestRepository completionUpdateRequestRepository;
    private final ObligationRepository obligationRepository;
    private final UserRepository userRepository;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional(readOnly = true)
    public List<EditionResponse> list() {
        return editionRepository.findAllByOrderByStartsAtDesc().stream()
                .map(EditionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public EditionRolloverPreviewResponse preview(UUID requesterId) {
        ensureFundador(requesterId);
        Edition current = activeEdition();
        Pendencias pendencias = contarPendencias(current);

        int nextYear = current.getYear() + 1;
        LocalDate nextStart = current.getEndsAt().plusDays(1);
        return new EditionRolloverPreviewResponse(
                EditionResponse.from(current),
                pendencias.completions(),
                pendencias.updateRequests(),
                pendencias.obligationsUnderReview(),
                obligationRepository.countByEditionIdAndStatusIn(current.getId(), OPEN_TO_CLOSE),
                pendencias.nenhuma(),
                "Reviradao " + nextYear,
                nextYear,
                nextStart,
                nextStart.plusYears(1).minusDays(1)
        );
    }

    @Transactional
    public EditionResponse rollover(UUID requesterId, EditionRolloverRequest request) {
        User fundador = ensureFundador(requesterId);

        // Trava a edicao ANTES de conferir: aprovacoes/recalculos em andamento terminam antes da virada,
        // e um segundo clique simultaneo so le a edicao depois que a primeira virada terminou.
        Edition current = editionRepository.lockById(request.currentEditionId())
                .orElseThrow(() -> new NotFoundException("Edicao nao encontrada"));
        if (!Boolean.TRUE.equals(current.getActive())) {
            throw new BusinessException("A edicao ativa mudou. Recarregue a pagina antes de tentar de novo.");
        }

        Pendencias pendencias = contarPendencias(current);
        if (!pendencias.nenhuma()) {
            throw new BusinessException("Ainda ha pendencias na edicao " + current.getName() + ": "
                    + pendencias.completions() + " pedido(s) de registro, "
                    + pendencias.updateRequests() + " pedido(s) de atualizacao e "
                    + pendencias.obligationsUnderReview() + " obrigacao(oes) em revisao. Resolva tudo antes da virada.");
        }

        String name = request.name().trim();
        validarNovaEdicao(current, name, request);

        List<Obligation> abertas = obligationRepository.findAllByEditionIdAndStatusIn(current.getId(), OPEN_TO_CLOSE);
        OffsetDateTime agora = OffsetDateTime.now();
        for (Obligation obligation : abertas) {
            obligation.setStatus(ObligationStatus.CANCELLED);
            obligation.setResolvedAt(agora);
        }
        obligationRepository.saveAll(abertas);

        current.setActive(false);
        // flush antes de criar a nova: o banco so aceita uma edicao ativa por vez.
        editionRepository.saveAndFlush(current);

        Edition next = editionRepository.saveAndFlush(Edition.builder()
                .id(UUID.randomUUID())
                .name(name)
                .year(request.year())
                .startsAt(request.startsAt())
                .endsAt(request.endsAt())
                .active(true)
                .build());

        adminAuditLogService.log(
                fundador,
                "EDITION_ROLLOVER",
                null,
                "Edicao " + current.getName() + " encerrada. Nova edicao ativa: " + next.getName()
                        + " (" + next.getStartsAt() + " a " + next.getEndsAt() + "). Obrigacoes abertas encerradas sem penalidade: "
                        + abertas.size() + "."
        );

        return EditionResponse.from(next);
    }

    private void validarNovaEdicao(Edition current, String name, EditionRolloverRequest request) {
        if (name.isEmpty()) {
            throw new BusinessException("Informe o nome da nova edicao");
        }
        if (request.startsAt().isAfter(request.endsAt())) {
            throw new BusinessException("A data de inicio precisa ser antes da data de fim");
        }
        if (!request.startsAt().isAfter(current.getEndsAt())) {
            throw new BusinessException("A nova edicao precisa comecar depois do fim da edicao atual (" + current.getEndsAt() + ")");
        }
        if (editionRepository.existsByYear(request.year())) {
            throw new BusinessException("Ja existe uma edicao do ano " + request.year());
        }
    }

    private Pendencias contarPendencias(Edition edition) {
        return new Pendencias(
                completionRepository.countByEditionIdAndStatus(edition.getId(), CompletionStatus.PENDING),
                completionUpdateRequestRepository.countByCompletionEditionIdAndStatus(edition.getId(), CompletionUpdateStatus.PENDING),
                obligationRepository.countByEditionIdAndStatusIn(edition.getId(), UNDER_REVIEW)
        );
    }

    private Edition activeEdition() {
        return editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));
    }

    private User ensureFundador(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
        if (user.getRole() != UserRole.FUNDADOR) {
            throw new BusinessException("Apenas o Fundador pode fazer a virada de edicao");
        }
        return user;
    }

    private record Pendencias(long completions, long updateRequests, long obligationsUnderReview) {
        boolean nenhuma() {
            return completions == 0 && updateRequests == 0 && obligationsUnderReview == 0;
        }
    }
}
