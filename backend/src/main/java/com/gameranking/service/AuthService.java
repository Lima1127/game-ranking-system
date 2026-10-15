package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.security.TokenService;
import com.gameranking.web.dto.auth.AuthResponse;
import com.gameranking.web.dto.auth.LoginRequest;
import com.gameranking.web.dto.auth.RegisterRequest;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.UUID;

@Service
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final TokenService tokenService;
    private final String inviteCode;

    public AuthService(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            TokenService tokenService,
            @Value("${app.registration.invite-code:}") String inviteCode
    ) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.tokenService = tokenService;
        this.inviteCode = inviteCode == null ? "" : inviteCode.trim();
    }

    /** Com o site publico na internet, so cria conta quem souber o codigo combinado no grupo. */
    public boolean isInviteRequired() {
        return !inviteCode.isEmpty();
    }

    public User register(RegisterRequest request) {
        if (isInviteRequired()) {
            String provided = request.inviteCode() == null ? "" : request.inviteCode().trim();
            if (!MessageDigest.isEqual(
                    provided.getBytes(StandardCharsets.UTF_8),
                    inviteCode.getBytes(StandardCharsets.UTF_8))) {
                throw new BusinessException("Codigo de convite invalido. Peca o codigo ao admin do Reviradao.");
            }
        }

        userRepository.findByEmailIgnoreCase(request.email()).ifPresent(u -> {
            throw new BusinessException("Email ja cadastrado");
        });

        User user = User.builder()
                .id(UUID.randomUUID())
                .displayName(request.displayName())
                .email(request.email().toLowerCase())
                .passwordHash(passwordEncoder.encode(request.password()))
                .role(UserRole.USER)
                .active(true)
                .build();

        return userRepository.save(user);
    }

    public AuthResponse login(LoginRequest request) {
        User user = userRepository.findByEmailIgnoreCase(request.email())
                .orElseThrow(() -> new BusinessException("Credenciais invalidas"));

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())
                || !Boolean.TRUE.equals(user.getActive())) {
            throw new BusinessException("Credenciais invalidas");
        }

        String accessToken = tokenService.createToken(user);
        return new AuthResponse(
                accessToken,
                "Bearer",
                tokenService.getExpirationSeconds(),
                user.getId(),
                user.getDisplayName(),
                user.getRole(),
                user.getAvatarUploadedAt()
        );
    }
}
