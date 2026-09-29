package com.gameranking.security;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class BearerTokenAuthenticationFilterTest {

    private final TokenService tokenService = new TokenService("0123456789abcdef0123456789abcdef-test", 7200);
    private final UserRepository userRepository = mock(UserRepository.class);
    private final BearerTokenAuthenticationFilter filter = new BearerTokenAuthenticationFilter(tokenService, userRepository);

    @AfterEach
    void clearContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void autenticaUsuarioExistenteEAtivo() throws Exception {
        UUID userId = UUID.randomUUID();
        when(userRepository.existsByIdAndActiveTrue(userId)).thenReturn(true);

        runWithTokenFor(userId);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
    }

    @Test
    void naoAutenticaTokenDeUsuarioQueNaoExisteNesteBanco() throws Exception {
        UUID userId = UUID.randomUUID();
        when(userRepository.existsByIdAndActiveTrue(userId)).thenReturn(false);

        runWithTokenFor(userId);

        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    private void runWithTokenFor(UUID userId) throws Exception {
        User user = User.builder().id(userId).role(UserRole.USER).build();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.addHeader("Authorization", "Bearer " + tokenService.createToken(user));
        filter.doFilter(request, new MockHttpServletResponse(), new MockFilterChain());
    }
}
