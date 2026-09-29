package com.gameranking.security;

import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.Base64;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Service
public class TokenService {

    static final int MIN_SECRET_BYTES = 32;
    private static final Set<String> KNOWN_PLACEHOLDER_SECRETS = Set.of(
            "reviradao-dev-secret-change-me",
            "troque-esta-chave-em-producao",
            "change-me-in-env"
    );

    private final byte[] secretBytes;
    private final long expirationSeconds;

    public TokenService(
            @Value("${app.jwt.secret:}") String secret,
            @Value("${app.jwt.expiration-seconds:7200}") long expirationSeconds
    ) {
        if (secret == null || secret.isBlank() || KNOWN_PLACEHOLDER_SECRETS.contains(secret.trim())) {
            throw new IllegalStateException(
                    "app.jwt.secret nao configurado (ou ainda com o valor de exemplo). "
                            + "Defina um segredo aleatorio no application.yml ou na variavel de ambiente APP_JWT_SECRET."
            );
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                    "app.jwt.secret precisa ter pelo menos " + MIN_SECRET_BYTES + " bytes (atual: " + bytes.length + ")."
            );
        }
        this.secretBytes = bytes;
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
            if (!MessageDigest.isEqual(
                    expectedSignature.getBytes(StandardCharsets.UTF_8),
                    parts[1].getBytes(StandardCharsets.UTF_8))) {
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
