package com.gameranking.service.scoring;

import com.gameranking.domain.model.ScoreEvent;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.Collection;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Regra "Cafe com leite" (UNDERDOG_BONUS): +3 para quem estava 20 pontos ou mais atras do lider.
 *
 * O placar usado e o do DIA EM QUE O JOGO FOI ZERADO, nao o de hoje. Assim quem cadastra o
 * historico depois (conta nova no meio do ano) e tratado como se tivesse registrado tudo na hora,
 * e a ordem em que o admin aprova nao muda o resultado.
 *
 * Entra no placar so o que aconteceu ANTES do dia do jogo (jogos do mesmo dia nao contam entre si):
 * - pontos de um jogo: pelo dia em que ele foi zerado;
 * - pontos sem jogo (obrigacoes): pelo dia em que aconteceram.
 */
public final class CafeComLeite {

    public static final long DIFERENCA_MINIMA = 20;
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private CafeComLeite() {
    }

    /** Dia em que o evento conta para o placar. */
    public static LocalDate diaDoEvento(ScoreEvent evento) {
        if (evento.getCompletion() != null && evento.getCompletion().getCompletedAt() != null) {
            return evento.getCompletion().getCompletedAt();
        }
        return evento.getCreatedAt() == null ? LocalDate.MIN : evento.getCreatedAt().atZoneSameInstant(FUSO).toLocalDate();
    }

    /** Pontos de cada jogador contando so o que aconteceu antes de `dia`. */
    public static Map<UUID, Long> placarAntesDe(Collection<ScoreEvent> eventos, LocalDate dia) {
        Map<UUID, Long> placar = new HashMap<>();
        for (ScoreEvent evento : eventos) {
            if (evento.getPoints() != null && diaDoEvento(evento).isBefore(dia)) {
                placar.merge(evento.getUser().getId(), evento.getPoints().longValue(), Long::sum);
            }
        }
        return placar;
    }

    /** true se o jogador estava 20 pontos ou mais atras do lider nesse placar. */
    public static boolean temDireito(Map<UUID, Long> placar, UUID userId) {
        long lider = placar.values().stream().mapToLong(Long::longValue).max().orElse(0L);
        long doJogador = placar.getOrDefault(userId, 0L);
        return Math.max(lider, 0L) - doJogador >= DIFERENCA_MINIMA;
    }

    /** Atalho: o jogador tem direito ao bonus por um jogo zerado em `dia`? */
    public static boolean temDireito(Collection<ScoreEvent> eventos, UUID userId, LocalDate dia) {
        return temDireito(placarAntesDe(eventos, dia), userId);
    }
}
