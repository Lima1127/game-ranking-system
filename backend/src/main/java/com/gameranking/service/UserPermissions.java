package com.gameranking.service;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;

import java.util.Arrays;
import java.util.List;

/**
 * Regras de quem pode gerenciar quem (decididas pelo grupo em 15/10/2026).
 *
 * <ul>
 *   <li>Ninguem altera o proprio cargo pelo site, nem o de quem esta no mesmo nivel ou acima.</li>
 *   <li>Mudar cargos: so Fundador e Co-fundador. Fundador concede Co-fundador, Admin e Jogador;
 *       Co-fundador concede Admin e Jogador. Fundador nunca e concedido pelo site.</li>
 *   <li>Editar nome de exibicao: equipe (Admin ou acima), no proprio nome ou em cargos abaixo.</li>
 *   <li>Senha temporaria ("ultimo caso"): equipe, apenas para cargos abaixo.</li>
 * </ul>
 */
public final class UserPermissions {

    private UserPermissions() {
    }

    public static boolean canChangeRole(User actor, User target) {
        return actor.getRole().nivel() >= UserRole.COFUNDADOR.nivel()
                && !isSamePerson(actor, target)
                && actor.getRole().isAbove(target.getRole());
    }

    /** Cargos que o ator pode conceder: todos abaixo do proprio (Fundador nunca). */
    public static List<UserRole> assignableRoles(User actor) {
        if (actor.getRole().nivel() < UserRole.COFUNDADOR.nivel()) {
            return List.of();
        }
        return Arrays.stream(UserRole.values())
                .filter(role -> role != UserRole.FUNDADOR && actor.getRole().isAbove(role))
                .toList();
    }

    public static boolean canAssignRole(User actor, User target, UserRole newRole) {
        return canChangeRole(actor, target) && assignableRoles(actor).contains(newRole);
    }

    public static boolean canEditDisplayName(User actor, User target) {
        return actor.getRole().isStaff()
                && (isSamePerson(actor, target) || actor.getRole().isAbove(target.getRole()));
    }

    public static boolean canResetPassword(User actor, User target) {
        return actor.getRole().isStaff()
                && !isSamePerson(actor, target)
                && actor.getRole().isAbove(target.getRole());
    }

    private static boolean isSamePerson(User a, User b) {
        return a.getId().equals(b.getId());
    }
}
