package com.gameranking.web.dto.completion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CompletionListItemResponse(
        UUID completionId,
        UUID userId,
        String userDisplayName,
        UUID gameId,
        String gameName,
        LocalDate completedAt,
        BigDecimal hoursPlayed,
        boolean platinum,
        List<String> ruleCodes
) {
    public CompletionListItemResponse(
            UUID completionId,
            UUID userId,
            String userDisplayName,
            UUID gameId,
            String gameName,
            LocalDate completedAt,
            BigDecimal hoursPlayed,
            boolean platinum
    ) {
        this(completionId, userId, userDisplayName, gameId, gameName, completedAt, hoursPlayed, platinum, List.of());
    }
}
