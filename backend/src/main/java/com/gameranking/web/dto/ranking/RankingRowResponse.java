package com.gameranking.web.dto.ranking;

import java.util.UUID;

public record RankingRowResponse(
        UUID userId,
        String displayName,
        Long totalPoints,
        Long underdogBonusCount
) {
}
