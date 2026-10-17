package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.SteamVerificationService;
import com.gameranking.web.dto.completion.CompletionSteamCheckResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Conferencia dos registros na Steam (horas e conquistas), mostrada na tela de Solicitacoes. */
@RestController
@RequestMapping("/api/v1/completions")
@RequiredArgsConstructor
public class CompletionSteamCheckController {

    private final SteamVerificationService steamVerificationService;

    @GetMapping("/steam-checks")
    public List<CompletionSteamCheckResponse> list(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(defaultValue = "") List<UUID> completionIds
    ) {
        return steamVerificationService.list(currentUser.userId(), completionIds);
    }

    @PostMapping("/{completionId}/steam-check")
    public CompletionSteamCheckResponse refresh(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID completionId
    ) {
        return steamVerificationService.refreshFor(currentUser.userId(), completionId);
    }
}
