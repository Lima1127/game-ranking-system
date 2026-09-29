package com.gameranking.security;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import org.junit.jupiter.api.Test;

import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class TokenServiceTest {

    private static final String STRONG_SECRET = "0123456789abcdef0123456789abcdef-test";

    @Test
    void recusaSegredoAusenteCurtoOuDeExemplo() {
        assertThatThrownBy(() -> new TokenService("", 7200)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TokenService("curto", 7200)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TokenService("reviradao-dev-secret-change-me", 7200)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new TokenService("troque-esta-chave-em-producao", 7200)).isInstanceOf(IllegalStateException.class);
    }

    @Test
    void tokenGeradoEValidoComOMesmoSegredo() {
        TokenService service = new TokenService(STRONG_SECRET, 7200);
        User user = User.builder().id(UUID.randomUUID()).role(UserRole.USER).build();

        Optional<AuthenticatedUser> parsed = service.parse(service.createToken(user));

        assertThat(parsed).contains(new AuthenticatedUser(user.getId(), UserRole.USER));
    }

    @Test
    void tokenAssinadoComOutroSegredoEhRejeitado() {
        TokenService attacker = new TokenService("segredo-do-atacante-com-32-bytes-ou-mais", 7200);
        TokenService server = new TokenService(STRONG_SECRET, 7200);
        User admin = User.builder().id(UUID.randomUUID()).role(UserRole.ADMIN).build();

        assertThat(server.parse(attacker.createToken(admin))).isEmpty();
    }

    @Test
    void tokenComPayloadAdulteradoEhRejeitado() {
        TokenService service = new TokenService(STRONG_SECRET, 7200);
        User user = User.builder().id(UUID.randomUUID()).role(UserRole.USER).build();
        String token = service.createToken(user);
        String signature = token.substring(token.indexOf('.'));
        String forgedPayload = java.util.Base64.getUrlEncoder().withoutPadding()
                .encodeToString((user.getId() + "|ADMIN|9999999999").getBytes());

        assertThat(service.parse(forgedPayload + signature)).isEmpty();
    }

    @Test
    void tokenExpiradoEhRejeitado() {
        TokenService service = new TokenService(STRONG_SECRET, -10);
        User user = User.builder().id(UUID.randomUUID()).role(UserRole.USER).build();

        assertThat(service.parse(service.createToken(user))).isEmpty();
    }
}
