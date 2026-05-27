package com.gameranking.web.dto.ranking;

import java.util.UUID;
import java.time.OffsetDateTime;

public record RankingRowResponse(
        UUID userId,
        String displayName,
        Long totalPoints,
        Long underdogBonusCount,
        Boolean hasAvatar,
        OffsetDateTime avatarUploadedAt
) {
}
