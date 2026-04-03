package com.gameranking.web.dto.obligation;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateObligationRequest(
        @NotNull UUID assignedToUserId,
        @NotNull UUID gameId
) {
}
