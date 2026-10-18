package com.gameranking.web.dto.rotative;

import com.gameranking.domain.enums.RotativeReviewBand;

import java.util.List;
import java.util.UUID;

/**
 * Item da Lista Rotativa. reviewBand/steamReviewCount vem do sorteio da Steam (null em lista por
 * arquivo). flaggedTags (Nudez, Hentai...) e replacedGameName so vem preenchidos para admins.
 */
public record RotativeListEntryResponse(
        UUID id,
        UUID editionId,
        Short quarter,
        UUID gameId,
        String gameName,
        boolean active,
        Integer steamAppId,
        RotativeReviewBand reviewBand,
        Integer steamReviewCount,
        List<String> flaggedTags,
        // Jogo que este substituiu em "Sortear outro" (so para admins; null = nao foi trocado).
        String replacedGameName,
        java.time.OffsetDateTime rerolledAt
) {
}

