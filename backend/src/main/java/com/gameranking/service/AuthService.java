package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.User;
import com.gameranking.repository.UserRepository;
import com.gameranking.web.dto.auth.AuthResponse;
import com.gameranking.web.dto.auth.LoginRequest;
import com.gameranking.web.dto.auth.RegisterRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public User register(RegisterRequest request) {
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

        if (!passwordEncoder.matches(request.password(), user.getPasswordHash())) {
            throw new BusinessException("Credenciais invalidas");
        }

        String accessToken = "dev-token-" + user.getId();
        return new AuthResponse(accessToken, "Bearer", 7200L, user.getId(), user.getDisplayName(), user.getRole());
    }
}
