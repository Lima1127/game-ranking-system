package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CompletionRequestResponse(
        UUID completionId,
        UUID userId,
        String userDisplayName,
        UUID gameId,
        String gameName,
        LocalDate completedAt,
        BigDecimal hoursPlayed,
        boolean platinum,
        CompletionStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        UUID proofId,
        String proofContentType,
        UUID coopGroupId
) {
}

