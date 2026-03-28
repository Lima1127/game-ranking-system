package com.gameranking.web.dto.admin;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AdminAuditLogResponse(
        UUID id,
        UUID actorUserId,
        String actorDisplayName,
        String actorRole,
        String actionCode,
        UUID subjectCompletionId,
        UUID subjectUserId,
        String subjectDisplayName,
        String gameName,
        String details,
        OffsetDateTime createdAt
) {
}
