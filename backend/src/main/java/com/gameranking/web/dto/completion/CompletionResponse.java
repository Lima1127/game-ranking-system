package com.gameranking.web.dto.completion;

import java.util.UUID;

public record CompletionResponse(
        UUID id,
        UUID userId,
        UUID gameId,
        Integer awardedPoints
) {
}
