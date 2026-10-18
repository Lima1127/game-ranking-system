package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.PasswordResetService;
import com.gameranking.web.dto.user.PasswordResetResponses;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * "Esqueci minha senha" com codigo gerado por um admin (sem e-mail).
 * Rotas /auth/** sao publicas: quem esqueceu a senha nao esta logado.
 */
@RestController
@RequiredArgsConstructor
public class PasswordResetController {

    private final PasswordResetService passwordResetService;

    /** Sempre responde igual, exista ou nao o usuario (nao revela quem esta cadastrado). */
    @PostMapping("/api/v1/auth/password-reset/request")
    @ResponseStatus(HttpStatus.ACCEPTED)
    public Map<String, String> solicitar(@Valid @RequestBody PasswordResetResponses.SolicitarRequest request) {
        passwordResetService.solicitar(request.username());
        return Map.of("message", "Se o usuario estiver cadastrado, o pedido foi enviado. Avise um admin do grupo para receber o codigo.");
    }

    @PostMapping("/api/v1/auth/password-reset/confirm")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void redefinir(@Valid @RequestBody PasswordResetResponses.RedefinirRequest request) {
        passwordResetService.redefinir(request.username(), request.code(), request.newPassword());
    }

    @GetMapping("/api/v1/admin/password-resets")
    public List<PasswordResetResponses.PedidoPendente> pendentes(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return passwordResetService.listarPendentes(currentUser.userId());
    }

    @PostMapping("/api/v1/admin/password-resets/{pedidoId}/approve")
    public PasswordResetResponses.CodigoGerado aprovar(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID pedidoId
    ) {
        return passwordResetService.aprovar(currentUser.userId(), pedidoId);
    }

    @PostMapping("/api/v1/admin/password-resets/{pedidoId}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void recusar(@AuthenticationPrincipal AuthenticatedUser currentUser, @PathVariable UUID pedidoId) {
        passwordResetService.recusar(currentUser.userId(), pedidoId);
    }
}
