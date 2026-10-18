package com.gameranking.web.dto.rotative;

public record RotativeListGenerationResponse(
        short roundNumber,
        int carriedFromPreviousList,
        int addedFromSourcePool,
        int totalInCurrentList,
        // Aviso para o admin (ex.: nao havia 5 lancamentos do ano disponiveis). null = tudo certo.
        String warning
) {
}

