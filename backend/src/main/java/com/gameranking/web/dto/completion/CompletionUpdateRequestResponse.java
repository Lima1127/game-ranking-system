package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.CompletionUpdateStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record CompletionUpdateRequestResponse(
        UUID updateRequestId,
        UUID completionId,
        UUID userId,
        String userDisplayName,
        String gameName,
        LocalDate completedAt,
        BigDecimal hoursPlayed,
        boolean platinum,
        CompletionUpdateStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime approvedAt,
        UUID proofId,
        String proofContentType,
        boolean fromObligation,
        List<String> ruleCodes
) {
}
