package com.gameranking.domain.enums;

/**
 * Cargos do Reviradao, do menor para o maior.
 * FUNDADOR so e definido direto no banco de dados (nunca pelo site).
 * Regras de quem pode alterar o que: ver UserPermissions.
 */
public enum UserRole {
    USER(0),
    ADMIN(1),
    COFUNDADOR(2),
    FUNDADOR(3);

    private final int nivel;

    UserRole(int nivel) {
        this.nivel = nivel;
    }

    public int nivel() {
        return nivel;
    }

    /** Equipe = Admin ou acima: aprova pedidos, revisa obrigacoes, acessa o painel Admin. */
    public boolean isStaff() {
        return nivel >= ADMIN.nivel;
    }

    public boolean isAbove(UserRole outro) {
        return nivel > outro.nivel;
    }
}
