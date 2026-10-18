package com.gameranking.web.dto.auth;

import com.gameranking.common.UsuarioDeLogin;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Pattern(regexp = UsuarioDeLogin.PADRAO_DIGITADO, message = UsuarioDeLogin.MENSAGEM) String username,
        @NotBlank @Size(min = 6, max = 120) String password,
        // Obrigatorio apenas quando app.registration.invite-code estiver configurado.
        @Size(max = 120) String inviteCode
) {
}
