package com.gameranking.domain.enums;

/**
 * Vaga de um jogo sorteado para a Lista Rotativa. Regra do grupo (30 jogos):
 *   22 com 1400+ avaliacoes, sendo pelo menos 5 lancados no ano da edicao (CURRENT_YEAR) e pelo
 *   menos 10 com 3000+ avaliacoes (TOP); as outras 7 vagas sao 1400+ livres (HIGH);
 *   8 com 1000 a 1399 avaliacoes (MID).
 *
 * Um jogo que serve para mais de uma vaga ocupa uma so (ex.: lancamento do ano com 3000+ avaliacoes
 * conta como lancamento do ano). Por isso a regra e "pelo menos".
 */
public enum RotativeReviewBand {
    CURRENT_YEAR(1400, Integer.MAX_VALUE, 5),
    TOP(3000, Integer.MAX_VALUE, 10),
    HIGH(1400, Integer.MAX_VALUE, 7),
    MID(1000, 1399, 8);

    private final int minReviews;
    private final int maxReviews;
    private final int gamesPerList;

    RotativeReviewBand(int minReviews, int maxReviews, int gamesPerList) {
        this.minReviews = minReviews;
        this.maxReviews = maxReviews;
        this.gamesPerList = gamesPerList;
    }

    /** O jogo serve para esta vaga? (CURRENT_YEAR tambem exige o ano de lancamento.) */
    public boolean accepts(int reviewCount, Integer releaseYear, int currentYear) {
        boolean reviewsOk = reviewCount >= minReviews && reviewCount <= maxReviews;
        return this == CURRENT_YEAR ? reviewsOk && releaseYear != null && releaseYear == currentYear : reviewsOk;
    }

    public int gamesPerList() {
        return gamesPerList;
    }
}
