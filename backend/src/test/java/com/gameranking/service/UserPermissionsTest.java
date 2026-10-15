package com.gameranking.service;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import org.junit.jupiter.api.Test;

import java.util.UUID;

import static com.gameranking.domain.enums.UserRole.ADMIN;
import static com.gameranking.domain.enums.UserRole.COFUNDADOR;
import static com.gameranking.domain.enums.UserRole.FUNDADOR;
import static com.gameranking.domain.enums.UserRole.USER;
import static org.assertj.core.api.Assertions.assertThat;

class UserPermissionsTest {

    private static User usuario(UserRole role) {
        return User.builder().id(UUID.randomUUID()).role(role).displayName(role.name()).build();
    }

    private final User fundador = usuario(FUNDADOR);
    private final User cofundador = usuario(COFUNDADOR);
    private final User admin = usuario(ADMIN);
    private final User jogador = usuario(USER);

    @Test
    void equipeEhAdminOuAcima() {
        assertThat(USER.isStaff()).isFalse();
        assertThat(ADMIN.isStaff()).isTrue();
        assertThat(COFUNDADOR.isStaff()).isTrue();
        assertThat(FUNDADOR.isStaff()).isTrue();
    }

    @Test
    void fundadorConcedeCofundadorAdminEJogadorMasNuncaFundador() {
        assertThat(UserPermissions.assignableRoles(fundador)).containsExactly(USER, ADMIN, COFUNDADOR);
        assertThat(UserPermissions.canAssignRole(fundador, jogador, COFUNDADOR)).isTrue();
        assertThat(UserPermissions.canAssignRole(fundador, jogador, FUNDADOR)).isFalse();
        assertThat(UserPermissions.canChangeRole(fundador, cofundador)).isTrue();
    }

    @Test
    void cofundadorGerenciaAdminsEJogadoresSomente() {
        assertThat(UserPermissions.assignableRoles(cofundador)).containsExactly(USER, ADMIN);
        assertThat(UserPermissions.canAssignRole(cofundador, jogador, ADMIN)).isTrue();
        assertThat(UserPermissions.canAssignRole(cofundador, admin, USER)).isTrue();
        assertThat(UserPermissions.canAssignRole(cofundador, jogador, COFUNDADOR)).isFalse();
        assertThat(UserPermissions.canChangeRole(cofundador, usuario(COFUNDADOR))).isFalse();
        assertThat(UserPermissions.canChangeRole(cofundador, fundador)).isFalse();
    }

    @Test
    void adminEJogadorNaoMudamCargos() {
        assertThat(UserPermissions.assignableRoles(admin)).isEmpty();
        assertThat(UserPermissions.canChangeRole(admin, jogador)).isFalse();
        assertThat(UserPermissions.canChangeRole(jogador, usuario(USER))).isFalse();
    }

    @Test
    void ninguemMudaOProprioCargo() {
        assertThat(UserPermissions.canChangeRole(fundador, fundador)).isFalse();
        assertThat(UserPermissions.canChangeRole(cofundador, cofundador)).isFalse();
    }

    @Test
    void nomeEditadoPelaEquipeNoProprioOuEmCargosAbaixo() {
        assertThat(UserPermissions.canEditDisplayName(admin, admin)).isTrue();
        assertThat(UserPermissions.canEditDisplayName(admin, jogador)).isTrue();
        assertThat(UserPermissions.canEditDisplayName(admin, usuario(ADMIN))).isFalse();
        assertThat(UserPermissions.canEditDisplayName(admin, fundador)).isFalse();
        assertThat(UserPermissions.canEditDisplayName(jogador, jogador)).isFalse();
        assertThat(UserPermissions.canEditDisplayName(fundador, cofundador)).isTrue();
    }

    @Test
    void senhaTemporariaSoParaCargosAbaixoENuncaParaSiMesmo() {
        assertThat(UserPermissions.canResetPassword(admin, jogador)).isTrue();
        assertThat(UserPermissions.canResetPassword(admin, usuario(ADMIN))).isFalse();
        assertThat(UserPermissions.canResetPassword(admin, admin)).isFalse();
        assertThat(UserPermissions.canResetPassword(cofundador, admin)).isTrue();
        assertThat(UserPermissions.canResetPassword(cofundador, fundador)).isFalse();
        assertThat(UserPermissions.canResetPassword(jogador, usuario(USER))).isFalse();
    }

    @Test
    void senhaTemporariaTemTamanhoFixoESemCaracteresAmbiguos() {
        for (int i = 0; i < 200; i++) {
            String senha = UserAdminService.gerarSenhaTemporaria();
            assertThat(senha).hasSize(10).doesNotContainPattern("[0O1lI]");
        }
    }
}
