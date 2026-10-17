package com.gameranking.web.dto.game;

import java.util.UUID;

/**
 * Sugestao da loja Steam para o campo "Jogo".
 * existingGameId vem preenchido quando o jogo ja esta no catalogo do Reviradao.
 */
public record SteamGameSuggestionResponse(
        int steamAppId,
        String name,
        String imageUrl,
        UUID existingGameId
) {
}
