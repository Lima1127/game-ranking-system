package com.gameranking.web.dto.rotative;

public record RotativeListGenerationResponse(
        short roundNumber,
        int carriedFromPreviousList,
        int addedFromSourcePool,
        int totalInCurrentList
) {
}

