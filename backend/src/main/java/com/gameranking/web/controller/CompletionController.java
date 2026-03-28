package com.gameranking.web.controller;

import com.gameranking.service.CompletionService;
import com.gameranking.service.CompletionUpdateService;
import com.gameranking.web.dto.completion.CompletionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionListItemResponse;
import com.gameranking.web.dto.completion.CompletionRequestResponse;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CompletionUpdateRequestResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import com.gameranking.web.dto.completion.CreateCompletionUpdateRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/completions")
@RequiredArgsConstructor
public class CompletionController {

    private final CompletionService completionService;
    private final CompletionUpdateService completionUpdateService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompletionResponse create(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateCompletionRequest request
    ) {
        return completionService.create(userId, request);
    }

    @GetMapping
    public List<CompletionListItemResponse> list(@RequestParam(required = false) UUID editionId) {
        return completionService.list(editionId);
    }

    @GetMapping("/{completionId}")
    public CompletionDetailsResponse getById(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID completionId
    ) {
        return completionUpdateService.getCompletion(userId, completionId);
    }

    @GetMapping("/requests")
    public List<CompletionRequestResponse> listRequests(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) UUID editionId
    ) {
        return completionService.listRequests(userId, editionId);
    }

    @PostMapping("/{completionId}/approve")
    public CompletionResponse approve(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID completionId
    ) {
        return completionService.approve(userId, completionId);
    }

    @PostMapping("/{completionId}/cancel")
    public CompletionResponse cancel(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID completionId
    ) {
        return completionService.cancel(userId, completionId);
    }

    @GetMapping("/update-requests")
    public List<CompletionUpdateRequestResponse> listUpdateRequests(
            @RequestHeader("X-User-Id") UUID userId,
            @RequestParam(required = false) UUID editionId
    ) {
        return completionUpdateService.list(userId, editionId);
    }

    @PostMapping("/{completionId}/update-requests")
    @ResponseStatus(HttpStatus.CREATED)
    public CompletionUpdateRequestResponse createUpdateRequest(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID completionId,
            @Valid @RequestBody CreateCompletionUpdateRequest request
    ) {
        return completionUpdateService.create(userId, completionId, request);
    }

    @PostMapping("/update-requests/{updateRequestId}/approve")
    public CompletionResponse approveUpdateRequest(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID updateRequestId
    ) {
        return completionUpdateService.approve(userId, updateRequestId);
    }

    @PostMapping("/update-requests/{updateRequestId}/cancel")
    public CompletionUpdateRequestResponse cancelUpdateRequest(
            @RequestHeader("X-User-Id") UUID userId,
            @PathVariable UUID updateRequestId
    ) {
        return completionUpdateService.cancel(userId, updateRequestId);
    }
}
