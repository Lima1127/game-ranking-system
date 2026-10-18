package com.gameranking.web.dto.completion;

import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateCompletionRequest(
        @NotNull UUID gameId,
        @NotNull LocalDate completedAt,
        @NotNull @DecimalMin("0.0") @DecimalMax("1000.0") BigDecimal hoursPlayed,
        boolean firstTimeEver,
        boolean completedInReleaseYear,
        boolean platinum,
        UUID platinumProofId,
        boolean coop,
        Integer coopPlayers,
        boolean hypeParticipation,
        boolean hypeCompletedBonus,
        boolean rotativeList,
        String notes,
        List<UUID> coopPlayerUserIds,
        // Outros jogadores que participaram do mesmo Hype: cada um ganha um registro so de participacao.
        List<UUID> hypePlayerUserIds,
        // Segunda imagem (opcional), enviada antes por POST /uploads/platinum.
        UUID extraProofId
) {
}
