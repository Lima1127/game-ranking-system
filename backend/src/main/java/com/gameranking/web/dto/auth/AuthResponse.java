package com.gameranking.web.dto.auth;

import com.gameranking.domain.enums.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuthResponse(
        String accessToken,
        String tokenType,
        Long expiresIn,
        UUID userId,
        String displayName,
        UserRole role,
        OffsetDateTime avatarUploadedAt
) {
}
