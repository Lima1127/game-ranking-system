package com.gameranking.web.controller;

import com.gameranking.domain.model.User;
import com.gameranking.service.AuthService;
import com.gameranking.web.dto.auth.AuthResponse;
import com.gameranking.web.dto.auth.LoginRequest;
import com.gameranking.web.dto.auth.RegisterRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public Map<String, Object> register(@Valid @RequestBody RegisterRequest request) {
        User user = authService.register(request);
        return Map.of(
                "id", user.getId(),
                "displayName", user.getDisplayName(),
                "email", user.getEmail(),
                "role", user.getRole()
        );
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }
}
