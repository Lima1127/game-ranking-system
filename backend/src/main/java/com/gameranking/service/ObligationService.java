package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.ObligationStatus;
import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.Obligation;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ObligationRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.obligation.CreateObligationRequest;
import com.gameranking.web.dto.obligation.ObligationItemResponse;
import com.gameranking.web.dto.obligation.ObligationOverviewResponse;
import com.gameranking.web.dto.obligation.SubmitObligationReviewRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ObligationService {
    private static final List<ObligationStatus> ACTIVE_TARGET_STATUSES = List.of(
            ObligationStatus.PENDING,
            ObligationStatus.ACCEPTED,
            ObligationStatus.REVIEW_PENDING_PARTIAL,
            ObligationStatus.REVIEW_PENDING_COMPLETION
    );

    private final ObligationRepository obligationRepository;
    private final EditionRepository editionRepository;
    private final UserRepository userRepository;
    private final GameService gameService;
    private final CompletionRepository completionRepository;
    private final ScoreEventRepository scoreEventRepository;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional(readOnly = true)
    public ObligationOverviewResponse list(UUID requesterId, UUID editionId) {
        Edition edition = resolveEdition(editionId);
        User requester = findUser(requesterId);

        List<ObligationItemResponse> items = requester.getRole() == UserRole.ADMIN
                ? obligationRepository.listByEditionId(edition.getId())
                : obligationRepository.listByEditionIdAndParticipantId(edition.getId(), requesterId);

        return new ObligationOverviewResponse(calculateAvailableAssignments(edition.getId(), requesterId), items);
    }

    @Transactional
    public ObligationItemResponse create(UUID requesterId, CreateObligationRequest request) {
        Edition edition = resolveEdition(null);
        User assignedBy = findUser(requesterId);
        User assignedTo = userRepository.findById(request.assignedToUserId())
                .orElseThrow(() -> new NotFoundException("Usuario alvo nao encontrado"));
        Game game = gameService.getById(request.gameId());

        if (assignedBy.getId().equals(assignedTo.getId())) {
            throw new BusinessException("Voce nao pode criar obrigacao para si mesmo");
        }

        int availableAssignments = calculateAvailableAssignments(edition.getId(), requesterId);
        if (availableAssignments <= 0) {
            throw new BusinessException("Voce ainda nao possui saldo de obrigacoes disponivel");
        }

        if (completionRepository.existsByUserIdAndGameIdAndStatus(assignedTo.getId(), game.getId(), CompletionStatus.APPROVED)) {
            throw new BusinessException("Nao e permitido obrigar alguem a jogar algo que ja foi zerado em outra edicao");
        }

        if (obligationRepository.existsByEditionIdAndAssignedToIdAndGameIdAndStatusIn(
                edition.getId(),
                assignedTo.getId(),
                game.getId(),
                ACTIVE_TARGET_STATUSES
        )) {
            throw new BusinessException("Ja existe uma obrigacao ativa para este jogador e jogo");
        }

        Obligation obligation = obligationRepository.save(Obligation.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .assignedBy(assignedBy)
                .assignedTo(assignedTo)
                .game(game)
                .status(ObligationStatus.PENDING)
                .accepted(false)
                .completed(false)
                .penaltyPoints(0)
                .rewardPoints(0)
                .slotConsumed(true)
                .createdAt(OffsetDateTime.now())
                .build());

        adminAuditLogService.log(
                assignedBy,
                "OBLIGATION_CREATED",
                null,
                "Obrigacao criada para " + assignedTo.getDisplayName() + " no jogo " + game.getName() + "."
        );

        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse accept(UUID requesterId, UUID obligationId) {
        Obligation obligation = findObligation(obligationId);
        ensureAssignedUserOrAdmin(requesterId, obligation, "aceitar");

        if (obligation.getStatus() != ObligationStatus.PENDING) {
            throw new BusinessException("Apenas obrigacoes pendentes podem ser aceitas");
        }

        obligation.setStatus(ObligationStatus.ACCEPTED);
        obligation.setAccepted(true);
        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse refuse(UUID requesterId, UUID obligationId) {
        Obligation obligation = findObligation(obligationId);
        User actor = findUser(requesterId);
        ensureAssignedUserOrAdmin(requesterId, obligation, "recusar");

        if (obligation.getStatus() != ObligationStatus.PENDING) {
            throw new BusinessException("Apenas obrigacoes pendentes podem ser recusadas");
        }

        obligation.setAccepted(false);
        obligation.setCompleted(false);
        obligation.setStatus(ObligationStatus.REFUSED);
        obligation.setPenaltyPoints(3);
        obligation.setResolvedAt(OffsetDateTime.now());
        obligation.setSlotConsumed(true);

        scoreEventRepository.save(ScoreEvent.builder()
                .id(UUID.randomUUID())
                .edition(obligation.getEdition())
                .user(obligation.getAssignedTo())
                .obligation(obligation)
                .sourceType(ScoreSourceType.OBLIGATION)
                .ruleCode("OBLIGATION_REFUSED")
                .points(-3)
                .reason("Recusou obrigacao")
                .createdAt(OffsetDateTime.now())
                .build());

        adminAuditLogService.log(
                actor,
                "OBLIGATION_REFUSED",
                null,
                "Obrigacao recusada por " + obligation.getAssignedTo().getDisplayName() + " para o jogo " + obligation.getGame().getName() + "."
        );

        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse cancel(UUID requesterId, UUID obligationId) {
        Obligation obligation = findObligation(obligationId);
        User actor = findUser(requesterId);

        boolean isAssignedTo = obligation.getAssignedTo().getId().equals(requesterId);
        boolean isAssignedBy = obligation.getAssignedBy().getId().equals(requesterId);
        boolean isAdmin = actor.getRole() == UserRole.ADMIN;

        if (!isAssignedTo && !isAssignedBy && !isAdmin) {
            throw new BusinessException("Voce nao pode cancelar esta obrigacao");
        }

        if (isAssignedBy) {
            if (!ACTIVE_TARGET_STATUSES.contains(obligation.getStatus())) {
                throw new BusinessException("O emissor so pode cancelar obrigacoes ativas");
            }

            scoreEventRepository.deleteByObligationId(obligation.getId());
            obligation.setAccepted(false);
            obligation.setCompleted(false);
            obligation.setStatus(ObligationStatus.CANCELLED);
            obligation.setPenaltyPoints(0);
            obligation.setRewardPoints(0);
            obligation.setPartialHours(null);
            obligation.setResolvedAt(OffsetDateTime.now());
            obligation.setSlotConsumed(false);

            adminAuditLogService.log(
                    actor,
                    "OBLIGATION_CANCELLED_BY_SENDER",
                    null,
                    "Obrigacao cancelada pelo emissor para o jogo " + obligation.getGame().getName() + ". Slot devolvido."
            );

            return toResponse(obligation);
        }

        if (obligation.getStatus() != ObligationStatus.ACCEPTED) {
            throw new BusinessException("O recebedor so pode cancelar obrigacoes aceitas");
        }

        obligation.setAccepted(false);
        obligation.setCompleted(false);
        obligation.setStatus(ObligationStatus.CANCELLED);
        obligation.setPenaltyPoints(3);
        obligation.setResolvedAt(OffsetDateTime.now());
        obligation.setSlotConsumed(true);

        scoreEventRepository.save(ScoreEvent.builder()
                .id(UUID.randomUUID())
                .edition(obligation.getEdition())
                .user(obligation.getAssignedTo())
                .obligation(obligation)
                .sourceType(ScoreSourceType.OBLIGATION)
                .ruleCode("OBLIGATION_CANCELLED")
                .points(-3)
                .reason("Cancelou obrigacao aceita")
                .createdAt(OffsetDateTime.now())
                .build());

        adminAuditLogService.log(
                actor,
                "OBLIGATION_CANCELLED",
                null,
                "Obrigacao cancelada apos aceite por " + obligation.getAssignedTo().getDisplayName() + " no jogo " + obligation.getGame().getName() + ". Slot mantido como consumido."
        );

        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse submitReview(UUID requesterId, UUID obligationId, SubmitObligationReviewRequest request) {
        Obligation obligation = findObligation(obligationId);
        User actor = findUser(requesterId);
        ensureAssignedUserOrAdmin(requesterId, obligation, "enviar para revisao");

        if (obligation.getStatus() != ObligationStatus.ACCEPTED) {
            throw new BusinessException("Apenas obrigacoes aceitas podem ser enviadas para revisao");
        }

        String normalizedOutcome = request.outcome().trim().toUpperCase();
        if (!normalizedOutcome.equals("PARTIAL") && !normalizedOutcome.equals("COMPLETED")) {
            throw new BusinessException("Escolha um resultado valido para a revisao");
        }

        if (normalizedOutcome.equals("PARTIAL")) {
            obligation.setPartialHours(null);
            obligation.setStatus(ObligationStatus.REVIEW_PENDING_PARTIAL);
        } else {
            obligation.setPartialHours(null);
            obligation.setStatus(ObligationStatus.REVIEW_PENDING_COMPLETION);
        }

        adminAuditLogService.log(
                actor,
                "OBLIGATION_REVIEW_SUBMITTED",
                null,
                "Obrigacao enviada para revisao com resultado " + normalizedOutcome + " no jogo " + obligation.getGame().getName() + "."
        );

        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse approveReview(UUID requesterId, UUID obligationId) {
        User admin = findUser(requesterId);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Apenas usuarios ADMIN podem aprovar revisoes de obrigacao");
        }

        Obligation obligation = findObligation(obligationId);
        if (obligation.getStatus() != ObligationStatus.REVIEW_PENDING_PARTIAL
                && obligation.getStatus() != ObligationStatus.REVIEW_PENDING_COMPLETION) {
            throw new BusinessException("Esta obrigacao nao esta aguardando revisao");
        }

        if (obligation.getStatus() == ObligationStatus.REVIEW_PENDING_PARTIAL) {
            obligation.setCompleted(false);
            obligation.setStatus(ObligationStatus.PARTIAL);
            obligation.setPenaltyPoints(1);
            obligation.setResolvedAt(OffsetDateTime.now());
            obligation.setSlotConsumed(true);

            scoreEventRepository.save(ScoreEvent.builder()
                    .id(UUID.randomUUID())
                    .edition(obligation.getEdition())
                    .user(obligation.getAssignedTo())
                    .obligation(obligation)
                    .sourceType(ScoreSourceType.OBLIGATION)
                    .ruleCode("OBLIGATION_PARTIAL")
                    .points(-1)
                    .reason("Tentativa parcial aprovada em obrigacao")
                    .createdAt(OffsetDateTime.now())
                    .build());
        } else {
            obligation.setCompleted(true);
            obligation.setStatus(ObligationStatus.COMPLETED);
            obligation.setRewardPoints(3);
            obligation.setResolvedAt(OffsetDateTime.now());
            obligation.setSlotConsumed(true);

            scoreEventRepository.save(ScoreEvent.builder()
                    .id(UUID.randomUUID())
                    .edition(obligation.getEdition())
                    .user(obligation.getAssignedTo())
                    .obligation(obligation)
                    .sourceType(ScoreSourceType.OBLIGATION)
                    .ruleCode("OBLIGATION_COMPLETED")
                    .points(3)
                    .reason("Obrigacao concluida com sucesso")
                    .createdAt(OffsetDateTime.now())
                    .build());
        }

        adminAuditLogService.log(
                admin,
                "OBLIGATION_REVIEW_APPROVED",
                null,
                "Revisao da obrigacao aprovada para o jogo " + obligation.getGame().getName() + "."
        );

        return toResponse(obligation);
    }

    @Transactional
    public ObligationItemResponse rejectReview(UUID requesterId, UUID obligationId) {
        User admin = findUser(requesterId);
        if (admin.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Apenas usuarios ADMIN podem rejeitar revisoes de obrigacao");
        }

        Obligation obligation = findObligation(obligationId);
        if (obligation.getStatus() != ObligationStatus.REVIEW_PENDING_PARTIAL
                && obligation.getStatus() != ObligationStatus.REVIEW_PENDING_COMPLETION) {
            throw new BusinessException("Esta obrigacao nao esta aguardando revisao");
        }

        obligation.setStatus(ObligationStatus.ACCEPTED);

        adminAuditLogService.log(
                admin,
                "OBLIGATION_REVIEW_REJECTED",
                null,
                "Revisao da obrigacao rejeitada para o jogo " + obligation.getGame().getName() + "."
        );

        return toResponse(obligation);
    }

    @Transactional
    public void resolveWithApprovedCompletion(Completion completion) {
        if (completion == null || completion.getStatus() != CompletionStatus.APPROVED) {
            return;
        }
        // Fluxo de obrigacao concluida agora depende de revisao dedicada na tela de obrigacoes.
    }

    private int calculateAvailableAssignments(UUID editionId, UUID userId) {
        Long totalPoints = scoreEventRepository.getTotalPointsForUser(editionId, userId);
        int earnedSlots = (int) ((totalPoints == null ? 0L : totalPoints) / 20L);
        long usedSlots = obligationRepository.countByEditionIdAndAssignedByIdAndSlotConsumedTrue(editionId, userId);
        return Math.max(0, earnedSlots - (int) usedSlots);
    }

    private void ensureAssignedUserOrAdmin(UUID requesterId, Obligation obligation, String action) {
        User requester = findUser(requesterId);
        boolean ownsObligation = obligation.getAssignedTo().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsObligation && !isAdmin) {
            throw new BusinessException("Voce nao pode " + action + " esta obrigacao");
        }
    }

    private Obligation findObligation(UUID obligationId) {
        return obligationRepository.findById(obligationId)
                .orElseThrow(() -> new NotFoundException("Obrigacao nao encontrada"));
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }

    private Edition resolveEdition(UUID editionId) {
        if (editionId != null) {
            return editionRepository.findById(editionId)
                    .orElseThrow(() -> new NotFoundException("Edicao nao encontrada"));
        }

        return editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));
    }

    private ObligationItemResponse toResponse(Obligation obligation) {
        return new ObligationItemResponse(
                obligation.getId(),
                obligation.getEdition().getId(),
                obligation.getAssignedBy().getId(),
                obligation.getAssignedBy().getDisplayName(),
                obligation.getAssignedTo().getId(),
                obligation.getAssignedTo().getDisplayName(),
                obligation.getGame().getId(),
                obligation.getGame().getName(),
                obligation.getStatus(),
                obligation.getAccepted(),
                obligation.getCompleted(),
                obligation.getPartialHours(),
                obligation.getLinkedCompletion() != null ? obligation.getLinkedCompletion().getId() : null,
                obligation.getPenaltyPoints(),
                obligation.getRewardPoints(),
                obligation.getCreatedAt(),
                obligation.getResolvedAt()
        );
    }
}
