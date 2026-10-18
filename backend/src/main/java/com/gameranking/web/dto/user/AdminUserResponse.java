package com.gameranking.web.dto.user;

import com.gameranking.domain.enums.UserRole;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

/**
 * Usuario na tela de gerenciamento. As permissoes ja vem calculadas pelo servidor
 * (o site so mostra os botoes que o admin logado pode usar).
 */
public record AdminUserResponse(
        UUID id,
        String displayName,
        String username,
        UserRole role,
        boolean active,
        boolean hasAvatar,
        OffsetDateTime avatarUploadedAt,
        OffsetDateTime createdAt,
        boolean self,
        boolean canChangeRole,
        List<UserRole> assignableRoles,
        boolean canEditDisplayName,
        boolean canResetPassword
) {
}
