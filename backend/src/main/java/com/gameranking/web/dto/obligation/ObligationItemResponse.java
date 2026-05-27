package com.gameranking.web.dto.obligation;

import com.gameranking.domain.enums.ObligationStatus;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

public record ObligationItemResponse(
        UUID obligationId,
        UUID editionId,
        UUID assignedByUserId,
        String assignedByDisplayName,
        UUID assignedToUserId,
        String assignedToDisplayName,
        UUID gameId,
        String gameName,
        ObligationStatus status,
        Boolean accepted,
        Boolean completed,
        BigDecimal partialHours,
        UUID linkedCompletionId,
        Integer penaltyPoints,
        Integer rewardPoints,
        OffsetDateTime createdAt,
        OffsetDateTime resolvedAt
) {
}
