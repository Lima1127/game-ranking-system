package com.gameranking.web.dto.admin;

import com.gameranking.domain.enums.CompletionStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminCompletionItemResponse(
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
        OffsetDateTime cancelledAt,
        UUID proofId,
        String proofContentType,
        long awardedPoints
) {
    public AdminCompletionItemResponse(
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
            OffsetDateTime cancelledAt,
            UUID proofId,
            String proofContentType
    ) {
        this(
                completionId,
                userId,
                userDisplayName,
                gameId,
                gameName,
                completedAt,
                hoursPlayed,
                platinum,
                status,
                createdAt,
                approvedAt,
                cancelledAt,
                proofId,
                proofContentType,
                0L
        );
    }
}
