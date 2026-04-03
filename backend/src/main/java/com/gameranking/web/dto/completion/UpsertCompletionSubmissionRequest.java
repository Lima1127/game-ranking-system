package com.gameranking.web.dto.completion;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record UpsertCompletionSubmissionRequest(
        UUID gameId,
        @NotNull LocalDate completedAt,
        @NotNull @DecimalMin("0.0") @DecimalMax("1000.0") BigDecimal hoursPlayed,
        boolean firstTimeEver,
        boolean completedInReleaseYear,
        boolean platinum,
        @NotNull UUID proofId,
        boolean coop,
        Integer coopPlayers,
        boolean hypeParticipation,
        boolean hypeCompletedBonus,
        boolean rotativeList,
        String notes
) {
}
