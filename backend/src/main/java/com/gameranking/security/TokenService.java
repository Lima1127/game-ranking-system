package com.gameranking.security;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.UUID;

@Service
public class TokenService {

    private final byte[] secretBytes;
    private final long expirationSeconds;

    public TokenService(
            @Value("${app.auth.token-secret:reviradao-dev-secret-change-me}") String secret,
            @Value("${app.auth.token-expiration-seconds:7200}") long expirationSeconds
    ) {
        this.secretBytes = secret.getBytes(StandardCharsets.UTF_8);
        this.expirationSeconds = expirationSeconds;
    }

    public String createToken(User user) {
        long expiresAt = Instant.now().plusSeconds(expirationSeconds).getEpochSecond();
        String payload = user.getId() + "|" + user.getRole().name() + "|" + expiresAt;
        String encodedPayload = Base64.getUrlEncoder().withoutPadding()
                .encodeToString(payload.getBytes(StandardCharsets.UTF_8));
        return encodedPayload + "." + sign(encodedPayload);
    }

    public Optional<AuthenticatedUser> parse(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 2) {
                return Optional.empty();
            }

            String encodedPayload = parts[0];
            String expectedSignature = sign(encodedPayload);
            if (!expectedSignature.equals(parts[1])) {
                return Optional.empty();
            }

            String payload = new String(Base64.getUrlDecoder().decode(encodedPayload), StandardCharsets.UTF_8);
            String[] values = payload.split("\\|");
            if (values.length != 3) {
                return Optional.empty();
            }

            UUID userId = UUID.fromString(values[0]);
            UserRole role = UserRole.valueOf(values[1]);
            long expiresAt = Long.parseLong(values[2]);
            if (Instant.now().getEpochSecond() > expiresAt) {
                return Optional.empty();
            }

            return Optional.of(new AuthenticatedUser(userId, role));
        } catch (Exception ignored) {
            return Optional.empty();
        }
    }

    public long getExpirationSeconds() {
        return expirationSeconds;
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secretBytes, "HmacSHA256"));
            byte[] signature = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception exception) {
            throw new IllegalStateException("Nao foi possivel assinar token", exception);
        }
    }
}
