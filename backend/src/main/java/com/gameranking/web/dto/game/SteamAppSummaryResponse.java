package com.gameranking.web.dto.game;

/**
 * Nome oficial e ano de lancamento de um jogo da loja Steam (null = ainda nao lancado ou sem data).
 * A tela usa o ano para ja deixar o bonus "Em dia" marcado ou desmarcado.
 */
public record SteamAppSummaryResponse(
        int steamAppId,
        String name,
        Integer releaseYear
) {
}
