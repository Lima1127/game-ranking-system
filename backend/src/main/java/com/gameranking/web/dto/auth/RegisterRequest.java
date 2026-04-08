package com.gameranking.web.dto.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record RegisterRequest(
        @NotBlank @Size(max = 120) String displayName,
        @NotBlank @Email @Size(max = 180) String email,
        @NotBlank @Size(min = 6, max = 120) String password
) {
}
