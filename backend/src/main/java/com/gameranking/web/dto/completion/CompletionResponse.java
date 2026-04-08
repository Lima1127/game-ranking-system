package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionStatus;

import java.util.UUID;

public record CompletionResponse(
        UUID id,
        UUID userId,
        UUID gameId,
        Integer awardedPoints,
        CompletionStatus status
) {
}
