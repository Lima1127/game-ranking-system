package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.ObligationService;
import com.gameranking.web.dto.obligation.CreateObligationRequest;
import com.gameranking.web.dto.obligation.ObligationItemResponse;
import com.gameranking.web.dto.obligation.ObligationOverviewResponse;
import com.gameranking.web.dto.obligation.SubmitObligationReviewRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/obligations")
@RequiredArgsConstructor
public class ObligationController {

    private final ObligationService obligationService;

    @GetMapping
    public ObligationOverviewResponse list(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return obligationService.list(currentUser.userId(), editionId);
    }

    @PostMapping
    public ObligationItemResponse create(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody CreateObligationRequest request
    ) {
        return obligationService.create(currentUser.userId(), request);
    }

    @PostMapping("/{obligationId}/accept")
    public ObligationItemResponse accept(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId
    ) {
        return obligationService.accept(currentUser.userId(), obligationId);
    }

    @PostMapping("/{obligationId}/refuse")
    public ObligationItemResponse refuse(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId
    ) {
        return obligationService.refuse(currentUser.userId(), obligationId);
    }

    @PostMapping("/{obligationId}/cancel")
    public ObligationItemResponse cancel(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId
    ) {
        return obligationService.cancel(currentUser.userId(), obligationId);
    }

    @PostMapping("/{obligationId}/submit-review")
    public ObligationItemResponse submitReview(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId,
            @Valid @RequestBody SubmitObligationReviewRequest request
    ) {
        return obligationService.submitReview(currentUser.userId(), obligationId, request);
    }

    @PostMapping("/{obligationId}/approve-review")
    public ObligationItemResponse approveReview(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId
    ) {
        return obligationService.approveReview(currentUser.userId(), obligationId);
    }

    @PostMapping("/{obligationId}/reject-review")
    public ObligationItemResponse rejectReview(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID obligationId
    ) {
        return obligationService.rejectReview(currentUser.userId(), obligationId);
    }
}
