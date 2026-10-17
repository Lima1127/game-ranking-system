package com.gameranking.service.steam;

import java.util.List;

/**
 * Dados oficiais de um jogo na loja Steam.
 * releaseYear e null quando o jogo ainda nao foi lancado ou a Steam nao informa a data.
 */
public record SteamAppDetails(
        int appId,
        String name,
        Integer releaseYear,
        List<String> genres
) {
}
