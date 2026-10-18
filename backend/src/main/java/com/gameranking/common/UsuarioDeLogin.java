package com.gameranking.common;

import java.util.Locale;

/**
 * Regra do "usuario" usado para entrar no site (ex.: samy, hollow_kg).
 * 3 a 20 caracteres: letras minusculas, numeros, ponto e sublinhado. O banco tem a mesma regra (V27).
 */
public final class UsuarioDeLogin {

    /** Para validar o que o jogador digita (maiusculas e espacos nas pontas sao aceitos: normalizar() limpa). */
    public static final String PADRAO_DIGITADO = "^\\s*[A-Za-z0-9._]{3,20}\\s*$";
    public static final String MENSAGEM = "O usuario deve ter de 3 a 20 caracteres: letras, numeros, ponto ou sublinhado";

    private UsuarioDeLogin() {
    }

    /** "  Samy " -> "samy" */
    public static String normalizar(String usuario) {
        return usuario == null ? "" : usuario.trim().toLowerCase(Locale.ROOT);
    }
}
