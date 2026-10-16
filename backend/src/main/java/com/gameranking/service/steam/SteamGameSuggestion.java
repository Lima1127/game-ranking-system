package com.gameranking.service.steam;

/** Um resultado da busca da loja Steam. imageUrl e a miniatura da loja (pode ser null). */
public record SteamGameSuggestion(
        int appId,
        String name,
        String imageUrl
) {
}
