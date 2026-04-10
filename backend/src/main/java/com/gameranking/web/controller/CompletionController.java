package com.gameranking.web.controller;

import com.gameranking.domain.enums.CompletionSubmissionKind;
import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.CompletionService;
import com.gameranking.service.CompletionSubmissionService;
import com.gameranking.service.CompletionUpdateService;
import com.gameranking.web.dto.completion.CompletionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionListItemResponse;
import com.gameranking.web.dto.completion.CompletionRequestResponse;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CompletionSubmissionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionSubmissionItemResponse;
import com.gameranking.web.dto.completion.CompletionUpdateRequestResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import com.gameranking.web.dto.completion.CreateCompletionUpdateRequest;
import com.gameranking.web.dto.completion.UpsertCompletionSubmissionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/completions")
@RequiredArgsConstructor
public class CompletionController {

    private final CompletionService completionService;
    private final CompletionSubmissionService completionSubmissionService;
    private final CompletionUpdateService completionUpdateService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompletionResponse create(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody CreateCompletionRequest request
    ) {
        return completionService.create(currentUser.userId(), request);
    }

    @GetMapping
    public List<CompletionListItemResponse> list(@RequestParam(required = false) UUID editionId) {
        return completionService.list(editionId);
    }

    @GetMapping("/{completionId}")
    public CompletionDetailsResponse getById(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID completionId
    ) {
        return completionUpdateService.getCompletion(currentUser.userId(), completionId);
    }

    @GetMapping("/requests")
    public List<CompletionRequestResponse> listRequests(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return completionService.listRequests(currentUser.userId(), editionId);
    }

    @PostMapping("/{completionId}/approve")
    public CompletionResponse approve(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID completionId
    ) {
        return completionService.approve(currentUser.userId(), completionId);
    }

    @PostMapping("/{completionId}/cancel")
    public CompletionResponse cancel(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID completionId
    ) {
        return completionService.cancel(currentUser.userId(), completionId);
    }

    @GetMapping("/submissions")
    public List<CompletionSubmissionItemResponse> listSubmissions(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return completionSubmissionService.list(currentUser.userId(), editionId);
    }

    @GetMapping("/submissions/{kind}/{submissionId}")
    public CompletionSubmissionDetailsResponse getSubmission(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable CompletionSubmissionKind kind,
            @PathVariable UUID submissionId
    ) {
        return completionSubmissionService.get(currentUser.userId(), kind, submissionId);
    }

    @PutMapping("/submissions/{kind}/{submissionId}")
    public CompletionSubmissionItemResponse updateSubmission(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable CompletionSubmissionKind kind,
            @PathVariable UUID submissionId,
            @Valid @RequestBody UpsertCompletionSubmissionRequest request
    ) {
        return completionSubmissionService.update(currentUser.userId(), kind, submissionId, request);
    }

    @PostMapping("/submissions/{kind}/{submissionId}/approve")
    public CompletionResponse approveSubmission(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable CompletionSubmissionKind kind,
            @PathVariable UUID submissionId
    ) {
        return completionSubmissionService.approve(currentUser.userId(), kind, submissionId);
    }

    @PostMapping("/submissions/{kind}/{submissionId}/cancel")
    public CompletionSubmissionItemResponse cancelSubmission(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable CompletionSubmissionKind kind,
            @PathVariable UUID submissionId
    ) {
        return completionSubmissionService.cancel(currentUser.userId(), kind, submissionId);
    }

    @GetMapping("/update-requests")
    public List<CompletionUpdateRequestResponse> listUpdateRequests(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return completionUpdateService.list(currentUser.userId(), editionId);
    }

    @PostMapping("/{completionId}/update-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public CompletionUpdateRequestResponse createUpdateRequest(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID completionId,
            @Valid @RequestBody CreateCompletionUpdateRequest request
    ) {
        return completionUpdateService.create(currentUser.userId(), completionId, request);
    }

    @PostMapping("/update-requests/{updateRequestId}/approve")
    public CompletionResponse approveUpdateRequest(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID updateRequestId
    ) {
        return completionUpdateService.approve(currentUser.userId(), updateRequestId);
    }

    @PostMapping("/update-requests/{updateRequestId}/cancel")
    public CompletionUpdateRequestResponse cancelUpdateRequest(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID updateRequestId
    ) {
        return completionUpdateService.cancel(currentUser.userId(), updateRequestId);
    }
}
