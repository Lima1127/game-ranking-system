package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.enums.CompletionSubmissionKind;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.completion.CompletionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionRequestResponse;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CompletionSubmissionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionSubmissionItemResponse;
import com.gameranking.web.dto.completion.CompletionUpdateRequestResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import com.gameranking.web.dto.completion.UpsertCompletionSubmissionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompletionSubmissionService {

    private final CompletionService completionService;
    private final CompletionUpdateService completionUpdateService;
    private final CompletionRepository completionRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CompletionSubmissionItemResponse> list(UUID requesterId, UUID editionId) {
        User requester = userRepository.findById(requesterId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        List<CompletionRequestResponse> completionRequests = completionService.listRequests(requesterId, editionId);
        List<CompletionUpdateRequestResponse> updateRequests = completionUpdateService.list(requesterId, editionId);

        List<CompletionSubmissionItemResponse> items = new java.util.ArrayList<>();
        completionRequests.forEach(request -> items.add(new CompletionSubmissionItemResponse(
                CompletionSubmissionKind.NEW_COMPLETION,
                request.completionId(),
                request.completionId(),
                request.userId(),
                request.userDisplayName(),
                request.gameId(),
                request.gameName(),
                request.completedAt(),
                request.hoursPlayed(),
                request.platinum(),
                request.status().name(),
                request.createdAt(),
                request.approvedAt(),
                request.proofId(),
                request.proofContentType(),
                request.coopGroupId(),
                request.status() == CompletionStatus.PENDING
                        && (request.userId().equals(requesterId) || requester.getRole() == UserRole.ADMIN),
                request.fromObligation(),
                request.ruleCodes()
        )));

        updateRequests.forEach(request -> items.add(new CompletionSubmissionItemResponse(
                CompletionSubmissionKind.UPDATE_COMPLETION,
                request.updateRequestId(),
                request.completionId(),
                request.userId(),
                request.userDisplayName(),
                null,
                request.gameName(),
                request.completedAt(),
                request.hoursPlayed(),
                request.platinum(),
                request.status().name(),
                request.createdAt(),
                request.approvedAt(),
                request.proofId(),
                request.proofContentType(),
                null,
                "PENDING".equals(request.status().name())
                        && (request.userId().equals(requesterId) || requester.getRole() == UserRole.ADMIN),
                request.fromObligation(),
                request.ruleCodes()
        )));

        items.sort(Comparator.comparing(CompletionSubmissionItemResponse::createdAt).reversed());
        return items;
    }

    @Transactional(readOnly = true)
    public CompletionSubmissionDetailsResponse get(UUID requesterId, CompletionSubmissionKind kind, UUID submissionId) {
        if (kind == CompletionSubmissionKind.NEW_COMPLETION) {
            CompletionDetailsResponse details = completionUpdateService.getCompletion(requesterId, submissionId);
            User requester = userRepository.findById(requesterId)
                    .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
            boolean editable = details.status() == CompletionStatus.PENDING
                    && (details.userId().equals(requesterId) || requester.getRole() == UserRole.ADMIN);

            return new CompletionSubmissionDetailsResponse(
                    CompletionSubmissionKind.NEW_COMPLETION,
                    details.completionId(),
                    details.completionId(),
                    details.userId(),
                    details.userDisplayName(),
                    details.gameId(),
                    details.gameName(),
                    details.completedAt(),
                    details.hoursPlayed(),
                    details.firstTimeEver(),
                    details.completedInReleaseYear(),
                    details.platinum(),
                    details.coop(),
                    details.coopPlayers(),
                    details.hypeParticipation(),
                    details.hypeCompletedBonus(),
                    details.rotativeList(),
                    details.notes(),
                    details.status().name(),
                    details.proofId(),
                    details.proofContentType(),
                    editable
            );
        }

        return completionUpdateService.getSubmission(requesterId, submissionId);
    }

    @Transactional
    public CompletionSubmissionItemResponse update(UUID requesterId, CompletionSubmissionKind kind, UUID submissionId, UpsertCompletionSubmissionRequest request) {
        if (kind == CompletionSubmissionKind.NEW_COMPLETION) {
            if (request.gameId() == null) {
                throw new BusinessException("Solicitacoes de novo registro exigem gameId");
            }

            CompletionResponse response = completionService.updatePending(
                    requesterId,
                    submissionId,
                    new CreateCompletionRequest(
                            request.gameId(),
                            request.completedAt(),
                            request.hoursPlayed(),
                            request.firstTimeEver(),
                            request.completedInReleaseYear(),
                            request.platinum(),
                            request.proofId(),
                            request.coop(),
                            request.coopPlayers(),
                            request.hypeParticipation(),
                            request.hypeCompletedBonus(),
                            request.rotativeList(),
                            request.notes(),
                            List.of()
                    )
            );

            return list(requesterId, null).stream()
                    .filter(item -> item.kind() == CompletionSubmissionKind.NEW_COMPLETION && item.submissionId().equals(response.id()))
                    .findFirst()
                    .orElseThrow(() -> new NotFoundException("Solicitacao atualizada nao encontrada"));
        }

        completionUpdateService.updatePending(requesterId, submissionId, request);
        return list(requesterId, null).stream()
                .filter(item -> item.kind() == CompletionSubmissionKind.UPDATE_COMPLETION && item.submissionId().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Solicitacao atualizada nao encontrada"));
    }

    @Transactional
    public CompletionResponse approve(UUID requesterId, CompletionSubmissionKind kind, UUID submissionId) {
        return kind == CompletionSubmissionKind.NEW_COMPLETION
                ? completionService.approve(requesterId, submissionId)
                : completionUpdateService.approve(requesterId, submissionId);
    }

    @Transactional
    public CompletionSubmissionItemResponse cancel(UUID requesterId, CompletionSubmissionKind kind, UUID submissionId) {
        if (kind == CompletionSubmissionKind.NEW_COMPLETION) {
            completionService.cancel(requesterId, submissionId);
        } else {
            completionUpdateService.cancel(requesterId, submissionId);
        }

        return list(requesterId, null).stream()
                .filter(item -> item.kind() == kind && item.submissionId().equals(submissionId))
                .findFirst()
                .orElseThrow(() -> new NotFoundException("Solicitacao cancelada nao encontrada"));
    }
}


