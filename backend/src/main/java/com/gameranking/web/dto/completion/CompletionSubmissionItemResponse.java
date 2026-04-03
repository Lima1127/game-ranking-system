package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionSubmissionKind;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

public record CompletionSubmissionItemResponse(
        CompletionSubmissionKind kind,
        UUID submissionId,
        UUID completionId,
        UUID userId,
        String userDisplayName,
        UUID gameId,
        String gameName,
        LocalDate completedAt,
        BigDecimal hoursPlayed,
        boolean platinum,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        UUID proofId,
        String proofContentType,
        boolean editable
) {
}
