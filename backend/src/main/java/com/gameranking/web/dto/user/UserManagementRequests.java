package com.gameranking.web.dto.user;

import com.gameranking.domain.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Pedidos da tela de usuarios e da troca da propria senha. */
public final class UserManagementRequests {

    private UserManagementRequests() {
    }

    public record ChangeRoleRequest(@NotNull UserRole role) {
    }

    public record ChangeDisplayNameRequest(@NotBlank @Size(max = 120) String displayName) {
    }

    public record ChangeOwnPasswordRequest(
            @NotBlank String currentPassword,
            @NotBlank @Size(min = 6, max = 120) String newPassword
    ) {
    }
}
