package com.gameranking.service;

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

import java.security.SecureRandom;
import java.util.List;
import java.util.UUID;

/**
 * Gerenciamento de usuarios (cargos, nome, senha). As regras de quem pode o que
 * ficam em UserPermissions; aqui elas sao aplicadas e registradas no log de auditoria.
 */
@Service
@RequiredArgsConstructor
public class UserAdminService {

    // Sem caracteres que se confundem (0/O, 1/l/I) para facilitar ditar a senha.
    private static final String ALFABETO_SENHA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int TAMANHO_SENHA_TEMPORARIA = 10;
    private static final SecureRandom RANDOM = new SecureRandom();

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

    /** "Ultimo caso": gera uma senha temporaria, mostrada uma unica vez para quem gerou. */
    @Transactional
    public String resetPassword(UUID actorId, UUID targetId) {
        User actor = ensureStaff(actorId);
        User target = findUser(targetId);

        if (!UserPermissions.canResetPassword(actor, target)) {
            throw new BusinessException("Voce nao pode redefinir a senha deste usuario");
        }

        String temporaria = gerarSenhaTemporaria();
        target.setPasswordHash(passwordEncoder.encode(temporaria));
        adminAuditLogService.logAboutUser(actor, "USER_PASSWORD_RESET", target,
                "Senha temporaria gerada pelo admin.");
        return temporaria;
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
        return new MeResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getRole(), user.getAvatarUploadedAt());
    }

    static String gerarSenhaTemporaria() {
        StringBuilder senha = new StringBuilder(TAMANHO_SENHA_TEMPORARIA);
        for (int i = 0; i < TAMANHO_SENHA_TEMPORARIA; i++) {
            senha.append(ALFABETO_SENHA.charAt(RANDOM.nextInt(ALFABETO_SENHA.length())));
        }
        return senha.toString();
    }

    private AdminUserResponse toResponse(User actor, User target) {
        boolean canChangeRole = UserPermissions.canChangeRole(actor, target);
        return new AdminUserResponse(
                target.getId(),
                target.getDisplayName(),
                target.getEmail(),
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
