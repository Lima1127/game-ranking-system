package com.gameranking.web.dto.completion;

import com.gameranking.domain.enums.SteamCheckStatus;

import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

/**
 * Conferencia de um registro na Steam, para o admin comparar com o que o jogador declarou.
 * status null = ainda nao conferido. editionStartsAt serve para avisar quando as conquistas
 * foram completadas antes da edicao.
 */
public record CompletionSteamCheckResponse(
        UUID completionId,
        SteamCheckStatus status,
        String steamId,
        Integer steamAppId,
        Integer playtimeMinutes,
        Integer achievementsTotal,
        Integer achievementsUnlocked,
        OffsetDateTime lastUnlockAt,
        OffsetDateTime checkedAt,
        LocalDate editionStartsAt,
        // Minimo de conquistas do jogo para valer como platina (regra do grupo).
        int minimumAchievementsForPlatinum
) {
}
