package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.ObligationStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Obligation;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ObligationRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.admin.AdminAuditLogResponse;
import com.gameranking.web.dto.admin.AdminCompletionItemResponse;
import com.gameranking.web.dto.admin.AdminRecalculationResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AdminService {

    private final UserRepository userRepository;
    private final CompletionRepository completionRepository;
    private final EditionRepository editionRepository;
    private final ObligationRepository obligationRepository;
    private final ScoreEventRepository scoreEventRepository;
    private final PlatinumProofService platinumProofService;
    private final AdminAuditLogService adminAuditLogService;
    private final EditionScoreRecalculationService editionScoreRecalculationService;

    @Transactional(readOnly = true)
    public List<AdminCompletionItemResponse> listCompletions(UUID adminUserId) {
        ensureAdmin(adminUserId);

        List<AdminCompletionItemResponse> items = completionRepository.listAdminItems();
        if (items.isEmpty()) {
            return items;
        }

        List<UUID> completionIds = items.stream().map(AdminCompletionItemResponse::completionId).toList();
        Map<UUID, Long> pointsByCompletionId = new LinkedHashMap<>();
        scoreEventRepository.listPointsByCompletionIds(completionIds).forEach(projection ->
                pointsByCompletionId.put(projection.getCompletionId(), projection.getTotalPoints())
        );

        return items.stream()
                .map(item -> new AdminCompletionItemResponse(
                        item.completionId(),
                        item.userId(),
                        item.userDisplayName(),
                        item.gameId(),
                        item.gameName(),
                        item.completedAt(),
                        item.hoursPlayed(),
                        item.platinum(),
                        item.status(),
                        item.createdAt(),
                        item.approvedAt(),
                        item.cancelledAt(),
                        item.proofId(),
                        item.proofContentType(),
                        pointsByCompletionId.getOrDefault(item.completionId(), 0L)
                ))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<AdminAuditLogResponse> listAuditLogs(UUID adminUserId) {
        ensureAdmin(adminUserId);
        return adminAuditLogService.list();
    }

    @Transactional
    public Map<String, Object> deleteCompletion(UUID adminUserId, UUID completionId) {
        User admin = ensureAdmin(adminUserId);
        Completion completion = completionRepository.findById(completionId)
                .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));
        boolean wasApproved = completion.getStatus() == CompletionStatus.APPROVED;
        Edition edition = completion.getEdition();

        if (wasApproved) {
            editionRepository.lockById(edition.getId());
        }

        long removedPoints = wasApproved
                ? scoreEventRepository.getTotalPointsForCompletion(completionId)
                : 0L;

        if (wasApproved) {
            // Remove tambem o OBLIGATION_COMPLETED, que referencia o registro.
            scoreEventRepository.deleteByCompletionId(completionId);
        }

        List<String> reopenedObligations = reopenObligationsLinkedTo(completion);

        platinumProofService.deleteByCompletionId(completionId);
        completionRepository.delete(completion);
        completionRepository.flush();

        if (wasApproved) {
            // Sem recalculo, o "primeiro na edicao" do proximo jogador so apareceria num recalculo futuro.
            editionScoreRecalculationService.recalculateEdition(edition);
        }

        String actionCode = wasApproved
                ? "COMPLETION_DELETED"
                : "REQUEST_HISTORY_DELETED";

        String details = wasApproved
                ? "Registro aprovado excluido pelo admin. Pontos removidos: " + removedPoints + ". Edicao recalculada."
                : "Historico de solicitacao excluido pelo admin com status original " + completion.getStatus() + ".";
        if (!reopenedObligations.isEmpty()) {
            details += " Obrigacoes reabertas (voltaram para ACEITA): " + String.join(", ", reopenedObligations) + ".";
        }

        adminAuditLogService.log(admin, actionCode, completion, details);

        return Map.of(
                "completionId", completionId,
                "removedPoints", removedPoints,
                "deletedStatus", completion.getStatus().name()
        );
    }

    @Transactional
    public AdminRecalculationResponse recalculateEdition(UUID adminUserId, UUID editionId) {
        User admin = ensureAdmin(adminUserId);
        Edition edition = resolveEdition(editionId);
        EditionScoreRecalculationService.RecalculationResult result = editionScoreRecalculationService.recalculateEdition(edition);

        adminAuditLogService.log(
                admin,
                "EDITION_RECALCULATED",
                null,
                "Edicao recalculada pelo admin. Conclusoes processadas: " + result.processedCompletions()
                        + ". Eventos regenerados: " + result.regeneratedScoreEvents() + "."
        );

        return new AdminRecalculationResponse(edition.getId(), result.processedCompletions(), result.regeneratedScoreEvents());
    }

    /**
     * Obrigacoes concluidas por este registro voltam para ACEITA (sem o +3), para o jogador
     * poder concluir de novo. Sem isso a exclusao violava a FK obligations.linked_completion_id.
     */
    private List<String> reopenObligationsLinkedTo(Completion completion) {
        List<Obligation> linked = obligationRepository.findByLinkedCompletion(completion);
        for (Obligation obligation : linked) {
            obligation.setLinkedCompletion(null);
            if (obligation.getStatus() == ObligationStatus.COMPLETED) {
                obligation.setStatus(ObligationStatus.ACCEPTED);
                obligation.setAccepted(true);
                obligation.setCompleted(false);
                obligation.setRewardPoints(0);
                obligation.setResolvedAt(null);
            }
        }
        obligationRepository.saveAllAndFlush(linked);
        return linked.stream().map(obligation -> obligation.getGame().getName()).toList();
    }

    private User ensureAdmin(UUID adminUserId) {
        User user = userRepository.findById(adminUserId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        if (user.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Acesso restrito a usuarios ADMIN");
        }

        return user;
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
