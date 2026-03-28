package com.gameranking.web.dto.completion;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.UUID;

public record CreateCompletionRequest(
        @NotNull UUID gameId,
        @NotNull LocalDate completedAt,
        @NotNull @DecimalMin("0.0") @DecimalMax("1000.0") BigDecimal hoursPlayed,
        boolean firstTimeEver,
        boolean platinum,
        UUID platinumProofId,
        boolean coop,
        Integer coopPlayers,
        boolean hypeParticipation,
        boolean hypeCompletedBonus,
        boolean rotativeList,
        String notes
) {
}
