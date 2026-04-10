package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.CompletionSubmissionKind;
import com.gameranking.domain.enums.CompletionUpdateStatus;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.CompletionUpdateRequest;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.CompletionUpdateRequestRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.completion.CompletionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionSubmissionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CompletionUpdateRequestResponse;
import com.gameranking.web.dto.completion.CreateCompletionUpdateRequest;
import com.gameranking.web.dto.completion.UpsertCompletionSubmissionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompletionUpdateService {

    private final CompletionRepository completionRepository;
    private final CompletionUpdateRequestRepository completionUpdateRequestRepository;
    private final EditionRepository editionRepository;
    private final UserRepository userRepository;
    private final PlatinumProofService platinumProofService;
    private final AdminAuditLogService adminAuditLogService;
    private final EditionScoreRecalculationService editionScoreRecalculationService;

    @Transactional(readOnly = true)
    public CompletionDetailsResponse getCompletion(UUID requesterId, UUID completionId) {
        CompletionDetailsResponse details = completionRepository.findDetailsById(completionId)
                .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));

        User requester = findUser(requesterId);
        boolean ownsRecord = details.userId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRecord && !isAdmin) {
            throw new BusinessException("Voce nao pode visualizar este registro");
        }

        return details;
    }

    @Transactional(readOnly = true)
    public List<CompletionUpdateRequestResponse> list(UUID requesterId, UUID editionId) {
        Edition edition = resolveEdition(editionId);
        User requester = findUser(requesterId);

        List<CompletionUpdateRequestResponse> items = requester.getRole() == UserRole.ADMIN
                ? completionUpdateRequestRepository.listByEditionId(edition.getId())
                : completionUpdateRequestRepository.listByEditionIdAndUserId(edition.getId(), requesterId);

        return items.stream()
                .map(item -> new CompletionUpdateRequestResponse(
                        item.updateRequestId(),
                        item.completionId(),
                        item.userId(),
                        item.userDisplayName(),
                        item.gameName(),
                        item.completedAt(),
                        item.hoursPlayed(),
                        item.platinum(),
                        item.status(),
                        item.createdAt(),
                        item.approvedAt(),
                        item.proofId(),
                        platinumProofService.getContentTypeIfExists(item.proofId())
                ))
                .toList();
    }

    @Transactional
    public CompletionUpdateRequestResponse create(UUID requesterId, UUID completionId, CreateCompletionUpdateRequest request) {
        Completion completion = completionRepository.findById(completionId)
                .orElseThrow(() -> new NotFoundException("Registro nao encontrado"));

        if (completion.getStatus() != CompletionStatus.APPROVED) {
            throw new BusinessException("Apenas registros aprovados podem receber solicitacao de atualizacao");
        }

        if (!completion.getUser().getId().equals(requesterId)) {
            throw new BusinessException("Apenas o proprio usuario pode solicitar atualizacao");
        }

        if (completionUpdateRequestRepository.existsByCompletionIdAndStatus(completionId, CompletionUpdateStatus.PENDING)) {
            throw new BusinessException("Ja existe uma solicitacao de atualizacao pendente para este registro");
        }

        if (!request.coop() && request.coopPlayers() != null) {
            throw new BusinessException("Quantidade de jogadores cooperativos so deve ser informada quando coop for verdadeiro");
        }

        if (request.coop() && request.coopPlayers() == null) {
            throw new BusinessException("Informe quantidade de jogadores para cooperativo");
        }

        platinumProofService.findById(request.proofId());

        CompletionUpdateRequest saved = completionUpdateRequestRepository.save(CompletionUpdateRequest.builder()
                .id(UUID.randomUUID())
                .completion(completion)
                .requestedBy(completion.getUser())
                .completedAt(request.completedAt())
                .hoursPlayed(request.hoursPlayed())
                .firstTimeEver(request.firstTimeEver())
                .completedInReleaseYear(request.completedInReleaseYear())
                .platinum(request.platinum())
                .proofId(request.proofId())
                .coop(request.coop())
                .coopPlayers(request.coopPlayers())
                .hypeParticipation(request.hypeParticipation())
                .hypeCompletedBonus(request.hypeCompletedBonus())
                .rotativeList(request.rotativeList())
                .notes(request.notes())
                .status(CompletionUpdateStatus.PENDING)
                .build());

        adminAuditLogService.log(
                completion.getUser(),
                "UPDATE_REQUEST_CREATED",
                completion,
                "Solicitacao de atualizacao criada para o registro aprovado."
        );

        return new CompletionUpdateRequestResponse(
                saved.getId(),
                completion.getId(),
                completion.getUser().getId(),
                completion.getUser().getDisplayName(),
                completion.getGame().getName(),
                saved.getCompletedAt(),
                saved.getHoursPlayed(),
                saved.isPlatinum(),
                saved.getStatus(),
                saved.getCreatedAt(),
                saved.getApprovedAt(),
                saved.getProofId(),
                platinumProofService.getContentTypeIfExists(saved.getProofId())
        );
    }

    @Transactional
    public CompletionResponse approve(UUID approverId, UUID updateRequestId) {
        Edition edition = resolveEdition(null);
        User approver = findUser(approverId);

        if (approver.getRole() != UserRole.ADMIN) {
            throw new BusinessException("Apenas usuarios ADMIN podem aprovar atualizacoes");
        }

        CompletionUpdateRequest updateRequest = completionUpdateRequestRepository.findByIdAndCompletionEditionId(updateRequestId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao de atualizacao nao encontrada"));

        if (updateRequest.getStatus() != CompletionUpdateStatus.PENDING) {
            throw new BusinessException("A solicitacao de atualizacao nao esta pendente");
        }

        Completion completion = updateRequest.getCompletion();
        completion.setCompletedAt(updateRequest.getCompletedAt());
        completion.setHoursPlayed(updateRequest.getHoursPlayed());
        completion.setFirstTimeEver(updateRequest.isFirstTimeEver());
        completion.setCompletedInReleaseYear(updateRequest.isCompletedInReleaseYear());
        completion.setPlatinum(updateRequest.isPlatinum());
        completion.setCoop(updateRequest.isCoop());
        completion.setCoopPlayers(updateRequest.getCoopPlayers());
        completion.setHypeParticipation(updateRequest.isHypeParticipation());
        completion.setHypeCompletedBonus(updateRequest.isHypeCompletedBonus());
        completion.setRotativeList(updateRequest.isRotativeList());
        completion.setNotes(updateRequest.getNotes());

        platinumProofService.replaceCompletionProof(updateRequest.getProofId(), completion);

        updateRequest.setStatus(CompletionUpdateStatus.APPROVED);
        updateRequest.setApprovedBy(approver);
        updateRequest.setApprovedAt(OffsetDateTime.now());

        editionScoreRecalculationService.recalculateEdition(edition);

        adminAuditLogService.log(
                approver,
                "UPDATE_REQUEST_APPROVED",
                completion,
                "Solicitacao de atualizacao aprovada e pontos recalculados."
        );

        return new CompletionResponse(completion.getId(), completion.getUser().getId(), completion.getGame().getId(), 0, completion.getStatus());
    }

    @Transactional
    public CompletionUpdateRequestResponse cancel(UUID requesterId, UUID updateRequestId) {
        Edition edition = resolveEdition(null);
        User requester = findUser(requesterId);

        CompletionUpdateRequest updateRequest = completionUpdateRequestRepository.findByIdAndCompletionEditionId(updateRequestId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao de atualizacao nao encontrada"));

        boolean ownsRequest = updateRequest.getRequestedBy().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRequest && !isAdmin) {
            throw new BusinessException("Voce nao pode cancelar esta atualizacao");
        }

        if (updateRequest.getStatus() != CompletionUpdateStatus.PENDING) {
            throw new BusinessException("Apenas atualizacoes pendentes podem ser canceladas");
        }

        updateRequest.setStatus(CompletionUpdateStatus.CANCELLED);
        updateRequest.setCancelledAt(OffsetDateTime.now());

        adminAuditLogService.log(
                requester,
                "UPDATE_REQUEST_CANCELLED",
                updateRequest.getCompletion(),
                isAdmin
                        ? "Solicitacao de atualizacao cancelada por um admin."
                        : "Solicitacao de atualizacao cancelada pelo proprio usuario."
        );

        return new CompletionUpdateRequestResponse(
                updateRequest.getId(),
                updateRequest.getCompletion().getId(),
                updateRequest.getRequestedBy().getId(),
                updateRequest.getRequestedBy().getDisplayName(),
                updateRequest.getCompletion().getGame().getName(),
                updateRequest.getCompletedAt(),
                updateRequest.getHoursPlayed(),
                updateRequest.isPlatinum(),
                updateRequest.getStatus(),
                updateRequest.getCreatedAt(),
                updateRequest.getApprovedAt(),
                updateRequest.getProofId(),
                platinumProofService.getContentTypeIfExists(updateRequest.getProofId())
        );
    }

    @Transactional(readOnly = true)
    public CompletionSubmissionDetailsResponse getSubmission(UUID requesterId, UUID updateRequestId) {
        User requester = findUser(requesterId);
        CompletionUpdateRequest updateRequest = completionUpdateRequestRepository.findById(updateRequestId)
                .orElseThrow(() -> new NotFoundException("Solicitacao de atualizacao nao encontrada"));

        boolean ownsRequest = updateRequest.getRequestedBy().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRequest && !isAdmin) {
            throw new BusinessException("Voce nao pode visualizar esta solicitacao");
        }

        return new CompletionSubmissionDetailsResponse(
                CompletionSubmissionKind.UPDATE_COMPLETION,
                updateRequest.getId(),
                updateRequest.getCompletion().getId(),
                updateRequest.getRequestedBy().getId(),
                updateRequest.getRequestedBy().getDisplayName(),
                updateRequest.getCompletion().getGame().getId(),
                updateRequest.getCompletion().getGame().getName(),
                updateRequest.getCompletedAt(),
                updateRequest.getHoursPlayed(),
                updateRequest.isFirstTimeEver(),
                updateRequest.isCompletedInReleaseYear(),
                updateRequest.isPlatinum(),
                updateRequest.isCoop(),
                updateRequest.getCoopPlayers(),
                updateRequest.isHypeParticipation(),
                updateRequest.isHypeCompletedBonus(),
                updateRequest.isRotativeList(),
                updateRequest.getNotes(),
                updateRequest.getStatus().name(),
                updateRequest.getProofId(),
                platinumProofService.getContentTypeIfExists(updateRequest.getProofId()),
                updateRequest.getStatus() == CompletionUpdateStatus.PENDING && (ownsRequest || isAdmin)
        );
    }

    @Transactional
    public CompletionUpdateRequestResponse updatePending(UUID requesterId, UUID updateRequestId, UpsertCompletionSubmissionRequest request) {
        Edition edition = resolveEdition(null);
        User requester = findUser(requesterId);
        CompletionUpdateRequest updateRequest = completionUpdateRequestRepository.findByIdAndCompletionEditionId(updateRequestId, edition.getId())
                .orElseThrow(() -> new NotFoundException("Solicitacao de atualizacao nao encontrada"));

        boolean ownsRequest = updateRequest.getRequestedBy().getId().equals(requesterId);
        boolean isAdmin = requester.getRole() == UserRole.ADMIN;

        if (!ownsRequest && !isAdmin) {
            throw new BusinessException("Voce nao pode editar esta solicitacao");
        }

        if (updateRequest.getStatus() != CompletionUpdateStatus.PENDING) {
            throw new BusinessException("Apenas atualizacoes pendentes podem ser editadas");
        }

        if (!request.coop() && request.coopPlayers() != null) {
            throw new BusinessException("Quantidade de jogadores cooperativos so deve ser informada quando coop for verdadeiro");
        }

        if (request.coop() && request.coopPlayers() == null) {
            throw new BusinessException("Informe quantidade de jogadores para cooperativo");
        }

        platinumProofService.findById(request.proofId());

        updateRequest.setCompletedAt(request.completedAt());
        updateRequest.setHoursPlayed(request.hoursPlayed());
        updateRequest.setFirstTimeEver(request.firstTimeEver());
        updateRequest.setCompletedInReleaseYear(request.completedInReleaseYear());
        updateRequest.setPlatinum(request.platinum());
        updateRequest.setProofId(request.proofId());
        updateRequest.setCoop(request.coop());
        updateRequest.setCoopPlayers(request.coopPlayers());
        updateRequest.setHypeParticipation(request.hypeParticipation());
        updateRequest.setHypeCompletedBonus(request.hypeCompletedBonus());
        updateRequest.setRotativeList(request.rotativeList());
        updateRequest.setNotes(request.notes());

        return new CompletionUpdateRequestResponse(
                updateRequest.getId(),
                updateRequest.getCompletion().getId(),
                updateRequest.getRequestedBy().getId(),
                updateRequest.getRequestedBy().getDisplayName(),
                updateRequest.getCompletion().getGame().getName(),
                updateRequest.getCompletedAt(),
                updateRequest.getHoursPlayed(),
                updateRequest.isPlatinum(),
                updateRequest.getStatus(),
                updateRequest.getCreatedAt(),
                updateRequest.getApprovedAt(),
                updateRequest.getProofId(),
                platinumProofService.getContentTypeIfExists(updateRequest.getProofId())
        );
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
}
