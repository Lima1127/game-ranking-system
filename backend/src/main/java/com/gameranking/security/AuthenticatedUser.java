package com.gameranking.security;

import com.gameranking.domain.enums.UserRole;

import java.util.UUID;

public record AuthenticatedUser(UUID userId, UserRole role) {
}
