package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.security.TokenService;
import com.gameranking.web.dto.auth.RegisterRequest;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceInviteTest {

    private final UserRepository userRepository = mock(UserRepository.class);
    private final TokenService tokenService = new TokenService("0123456789abcdef0123456789abcdef-test", 7200);

    private AuthService service(String inviteCode) {
        when(userRepository.findByEmailIgnoreCase(any())).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(call -> call.getArgument(0));
        return new AuthService(userRepository, new BCryptPasswordEncoder(4), tokenService, inviteCode);
    }

    private static RegisterRequest request(String inviteCode) {
        return new RegisterRequest("Joao", "joao@teste.com", "senha123", inviteCode);
    }

    @Test
    void semCodigoConfiguradoCadastroEAberto() {
        AuthService service = service("");

        assertThat(service.isInviteRequired()).isFalse();
        assertThat(service.register(request(null)).getEmail()).isEqualTo("joao@teste.com");
    }

    @Test
    void comCodigoConfiguradoAceitaSomenteOCodigoCerto() {
        AuthService service = service("reviradao-2026");

        assertThat(service.isInviteRequired()).isTrue();
        assertThatThrownBy(() -> service.register(request(null))).isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> service.register(request("errado"))).isInstanceOf(BusinessException.class);
        verify(userRepository, never()).save(any());

        assertThat(service.register(request("  reviradao-2026 ")).getEmail()).isEqualTo("joao@teste.com");
    }
}
