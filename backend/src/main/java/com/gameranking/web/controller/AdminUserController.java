package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.PasswordResetService;
import com.gameranking.service.UserAdminService;
import com.gameranking.web.dto.user.AdminUserResponse;
import com.gameranking.web.dto.user.PasswordResetResponses;
import com.gameranking.web.dto.user.UserManagementRequests;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

/** Tela "Usuarios" do painel Admin. Quem pode o que: UserPermissions. */
@RestController
@RequestMapping("/api/v1/admin/users")
@RequiredArgsConstructor
public class AdminUserController {

    private final UserAdminService userAdminService;
    private final PasswordResetService passwordResetService;

    @GetMapping
    public List<AdminUserResponse> list(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return userAdminService.listUsers(currentUser.userId());
    }

    @PatchMapping("/{userId}/role")
    public AdminUserResponse changeRole(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID userId,
            @Valid @RequestBody UserManagementRequests.ChangeRoleRequest request
    ) {
        return userAdminService.changeRole(currentUser.userId(), userId, request.role());
    }

    @PatchMapping("/{userId}/display-name")
    public AdminUserResponse changeDisplayName(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID userId,
            @Valid @RequestBody UserManagementRequests.ChangeDisplayNameRequest request
    ) {
        return userAdminService.changeDisplayName(currentUser.userId(), userId, request.displayName());
    }

    @PatchMapping("/{userId}/username")
    public AdminUserResponse changeUsername(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID userId,
            @Valid @RequestBody UserManagementRequests.ChangeUsernameRequest request
    ) {
        return userAdminService.changeUsername(currentUser.userId(), userId, request.username());
    }

    /**
     * Gera um codigo de redefinicao (30 min, uso unico) para o admin repassar ao jogador.
     * O admin nunca conhece a senha: o proprio jogador escolhe a nova em "Esqueci minha senha".
     */
    @PostMapping("/{userId}/reset-code")
    public PasswordResetResponses.CodigoGerado resetCode(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID userId
    ) {
        return passwordResetService.gerarParaUsuario(currentUser.userId(), userId);
    }
}
