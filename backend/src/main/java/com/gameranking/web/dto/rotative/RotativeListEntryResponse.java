package com.gameranking.web.dto.rotative;

import java.util.UUID;

public record RotativeListEntryResponse(
        UUID id,
        UUID editionId,
        Short quarter,
        UUID gameId,
        String gameName,
        boolean active
) {
}

