package com.gameranking.web.dto.game;

import java.util.Set;
import java.util.UUID;

public record GameResponse(
        UUID id,
        String name,
        Integer releaseYear,
        Set<String> genres
) {
}
