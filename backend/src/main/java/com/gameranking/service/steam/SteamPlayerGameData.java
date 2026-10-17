package com.gameranking.service.steam;

import com.gameranking.domain.enums.SteamCheckStatus;

import java.time.OffsetDateTime;

/**
 * O que a Steam informa sobre um jogo na conta de um jogador.
 * Com status OK, as horas vem sempre; as conquistas podem vir null se a Steam nao as informar
 * (achievementsTotal = 0 significa jogo sem conquistas).
 */
public record SteamPlayerGameData(
        SteamCheckStatus status,
        Integer playtimeMinutes,
        Integer achievementsTotal,
        Integer achievementsUnlocked,
        OffsetDateTime lastUnlockAt
) {
    public static SteamPlayerGameData of(SteamCheckStatus status) {
        return new SteamPlayerGameData(status, null, null, null, null);
    }
}
