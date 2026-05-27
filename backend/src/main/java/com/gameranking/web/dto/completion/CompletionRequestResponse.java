package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
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
        boolean fromObligation,
        CompletionStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        UUID proofId,
        String proofContentType,
        UUID coopGroupId,
        List<String> ruleCodes
) {
    public CompletionRequestResponse(
            UUID completionId,
            UUID userId,
            String userDisplayName,
            UUID gameId,
            String gameName,
            LocalDate completedAt,
            BigDecimal hoursPlayed,
            boolean platinum,
            boolean fromObligation,
            CompletionStatus status,
            OffsetDateTime createdAt,
            OffsetDateTime approvedAt,
            UUID proofId,
            String proofContentType,
            UUID coopGroupId
    ) {
        this(completionId, userId, userDisplayName, gameId, gameName, completedAt, hoursPlayed, platinum, fromObligation, status, createdAt, approvedAt, proofId, proofContentType, coopGroupId, List.of());
    }
}

