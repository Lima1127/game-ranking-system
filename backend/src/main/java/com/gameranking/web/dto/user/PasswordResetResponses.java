package com.gameranking.web.dto.user;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Pedidos e respostas do "Esqueci minha senha" (codigo gerado por um admin). */
public final class PasswordResetResponses {

    private PasswordResetResponses() {
    }

    public record SolicitarRequest(@NotBlank @Size(max = 40) String username) {
    }

    public record RedefinirRequest(
            @NotBlank @Size(max = 40) String username,
            @NotBlank @Size(max = 20) String code,
            @NotBlank @Size(min = 6, max = 120) String newPassword
    ) {
    }

    public record PedidoPendente(
            UUID id,
            UUID userId,
            String displayName,
            String username,
            OffsetDateTime requestedAt,
            boolean canDecide
    ) {
    }

    public record CodigoGerado(String code, OffsetDateTime expiresAt) {
    }
}
