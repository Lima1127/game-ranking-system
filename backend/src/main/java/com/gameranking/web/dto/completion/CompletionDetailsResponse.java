package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CompletionDetailsResponse(
        UUID completionId,
        UUID userId,
        String userDisplayName,
        UUID gameId,
        String gameName,
        LocalDate completedAt,
        BigDecimal hoursPlayed,
        boolean firstTimeEver,
        boolean completedInReleaseYear,
        boolean platinum,
        boolean coop,
        Integer coopPlayers,
        boolean hypeParticipation,
        boolean hypeCompletedBonus,
        boolean rotativeList,
        boolean fromObligation,
        String notes,
        CompletionStatus status,
        UUID proofId,
        String proofContentType
) {
}
