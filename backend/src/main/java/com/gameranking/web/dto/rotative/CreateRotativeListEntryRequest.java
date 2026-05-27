package com.gameranking.web.dto.rotative;

import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateRotativeListEntryRequest(
        @NotNull UUID gameId,
        Short quarter
) {
}

