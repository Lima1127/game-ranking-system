package com.gameranking.web.dto.admin;

import java.util.UUID;

public record AdminRecalculationResponse(
        UUID editionId,
        int processedCompletions,
        int regeneratedScoreEvents
) {
}
