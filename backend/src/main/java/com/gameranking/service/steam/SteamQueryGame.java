package com.gameranking.service.steam;

import java.util.Set;

/** Um jogo da busca da loja Steam: avaliacoes, ano de lancamento (pode ser null) e codigos das tags. */
public record SteamQueryGame(
        int appId,
        String name,
        int reviewCount,
        Integer releaseYear,
        Set<Integer> tagIds
) {
}
