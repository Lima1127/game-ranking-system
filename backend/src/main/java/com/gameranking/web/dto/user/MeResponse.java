package com.gameranking.web.dto.user;

import com.gameranking.domain.enums.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

/** Dados atuais do usuario logado (o site usa para atualizar cargo/nome sem novo login). */
public record MeResponse(
        UUID userId,
        String displayName,
        String email,
        UserRole role,
        OffsetDateTime avatarUploadedAt
) {
}
