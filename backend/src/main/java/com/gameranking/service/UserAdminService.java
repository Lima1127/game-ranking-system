package com.gameranking.service;

import com.gameranking.common.UsuarioDeLogin;
import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.user.AdminUserResponse;
import com.gameranking.web.dto.user.MeResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

/**
 * Gerenciamento de usuarios (cargos, nome, senha). As regras de quem pode o que
 * ficam em UserPermissions; aqui elas sao aplicadas e registradas no log de auditoria.
 */
@Service
@RequiredArgsConstructor
public class UserAdminService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AdminAuditLogService adminAuditLogService;

    @Transactional(readOnly = true)
    public List<AdminUserResponse> listUsers(UUID actorId) {
        User actor = ensureStaff(actorId);
        return userRepository.findAllByOrderByDisplayNameAsc().stream()
                .map(target -> toResponse(actor, target))
                .toList();
    }

    @Transactional
    public AdminUserResponse changeRole(UUID actorId, UUID targetId, UserRole newRole) {
        User actor = ensureStaff(actorId);
        User target = findUser(targetId);

        if (!UserPermissions.canChangeRole(actor, target)) {
            throw new BusinessException("Voce nao pode alterar o cargo deste usuario");
        }
        if (!UserPermissions.canAssignRole(actor, target, newRole)) {
            throw new BusinessException("Voce nao pode conceder este cargo");
        }

        UserRole anterior = target.getRole();
        if (anterior != newRole) {
            target.setRole(newRole);
            adminAuditLogService.logAboutUser(actor, "USER_ROLE_CHANGED", target,
                    "Cargo alterado de " + anterior + " para " + newRole + ".");
        }
        return toResponse(actor, target);
    }

    @Transactional
    public AdminUserResponse changeDisplayName(UUID actorId, UUID targetId, String displayName) {
        User actor = ensureStaff(actorId);
        User target = findUser(targetId);

        if (!UserPermissions.canEditDisplayName(actor, target)) {
            throw new BusinessException("Voce nao pode alterar o nome deste usuario");
        }

        String novoNome = displayName.trim();
        if (novoNome.isEmpty()) {
            throw new BusinessException("Informe um nome");
        }
        String anterior = target.getDisplayName();
        if (!anterior.equals(novoNome)) {
            target.setDisplayName(novoNome);
            adminAuditLogService.logAboutUser(actor, "USER_NAME_CHANGED", target,
                    "Nome alterado de \"" + anterior + "\" para \"" + novoNome + "\".");
        }
        return toResponse(actor, target);
    }

    @Transactional
    public AdminUserResponse changeUsername(UUID actorId, UUID targetId, String username) {
        User actor = ensureStaff(actorId);
        User target = findUser(targetId);

        if (!UserPermissions.canEditDisplayName(actor, target)) {
            throw new BusinessException("Voce nao pode alterar o usuario desta pessoa");
        }

        String novo = UsuarioDeLogin.normalizar(username);
        String anterior = target.getUsername();
        if (!anterior.equals(novo)) {
            if (userRepository.existsByUsername(novo)) {
                throw new BusinessException("Esse usuario ja existe. Escolha outro.");
            }
            target.setUsername(novo);
            adminAuditLogService.logAboutUser(actor, "USER_USERNAME_CHANGED", target,
                    "Usuario de login alterado de \"" + anterior + "\" para \"" + novo + "\".");
        }
        return toResponse(actor, target);
    }

    @Transactional
    public void changeOwnPassword(UUID userId, String currentPassword, String newPassword) {
        User user = findUser(userId);
        if (!passwordEncoder.matches(currentPassword, user.getPasswordHash())) {
            throw new BusinessException("A senha atual esta incorreta");
        }
        if (passwordEncoder.matches(newPassword, user.getPasswordHash())) {
            throw new BusinessException("A nova senha precisa ser diferente da atual");
        }
        user.setPasswordHash(passwordEncoder.encode(newPassword));
        adminAuditLogService.logAboutUser(user, "USER_PASSWORD_CHANGED", user, "Senha alterada pelo proprio usuario.");
    }

    @Transactional(readOnly = true)
    public MeResponse me(UUID userId) {
        User user = findUser(userId);
        return new MeResponse(user.getId(), user.getDisplayName(), user.getUsername(), user.getRole(), user.getAvatarUploadedAt(), user.getSteamId());
    }

    private AdminUserResponse toResponse(User actor, User target) {
        boolean canChangeRole = UserPermissions.canChangeRole(actor, target);
        return new AdminUserResponse(
                target.getId(),
                target.getDisplayName(),
                target.getUsername(),
                target.getRole(),
                Boolean.TRUE.equals(target.getActive()),
                target.getAvatarStorageKey() != null,
                target.getAvatarUploadedAt(),
                target.getCreatedAt(),
                actor.getId().equals(target.getId()),
                canChangeRole,
                canChangeRole ? UserPermissions.assignableRoles(actor) : List.of(),
                UserPermissions.canEditDisplayName(actor, target),
                UserPermissions.canResetPassword(actor, target)
        );
    }

    private User ensureStaff(UUID userId) {
        User user = findUser(userId);
        if (!user.getRole().isStaff()) {
            throw new BusinessException("Acesso restrito a administradores");
        }
        return user;
    }

    private User findUser(UUID userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));
    }
}
