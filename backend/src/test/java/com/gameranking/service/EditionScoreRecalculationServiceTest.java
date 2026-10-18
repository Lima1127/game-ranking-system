package com.gameranking.service;

import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.service.scoring.ScoringEngine;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class EditionScoreRecalculationServiceTest {

    private final CompletionRepository completionRepository = mock(CompletionRepository.class);
    private final EditionRepository editionRepository = mock(EditionRepository.class);
    private final ScoreEventRepository scoreEventRepository = mock(ScoreEventRepository.class);
    private final EditionScoreRecalculationService service = new EditionScoreRecalculationService(
            completionRepository, editionRepository, scoreEventRepository, new ScoringEngine());

    private final Edition edition = Edition.builder().id(UUID.randomUUID()).build();
    private final Game game = Game.builder().id(UUID.randomUUID()).name("Jogo").build();

    @Test
    void todosDoGrupoCoopQueFechouPrimeiroGanhamPrimeiroNaEdicao() {
        UUID coopGroup = UUID.randomUUID();
        Completion coopA = completion(coopGroup);
        Completion solo = completion(null);   // aprovado entre os dois membros do coop
        Completion coopB = completion(coopGroup);
        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId()))
                .thenReturn(List.of(coopA, solo, coopB));

        service.recalculateEdition(edition);

        assertThat(coopA.isFirstInEdition()).isTrue();
        assertThat(coopB.isFirstInEdition()).isTrue();
        assertThat(solo.isFirstInEdition()).isFalse();
    }

    @Test
    void semCoopApenasOPrimeiroAprovadoGanha() {
        Completion first = completion(null);
        Completion second = completion(null);
        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId()))
                .thenReturn(List.of(first, second));

        service.recalculateEdition(edition);

        assertThat(first.isFirstInEdition()).isTrue();
        assertThat(second.isFirstInEdition()).isFalse();
    }

    // ---------- Cafe com leite pelo placar do dia em que o jogo foi zerado ----------

    private final User lider = User.builder().id(UUID.randomUUID()).build();
    private final User novato = User.builder().id(UUID.randomUUID()).build();

    /** Jogo aprovado do jogador, zerado em `dia`. 250h = 10 blocos de tempo valioso (20 pts) + 1 = 21 pts ou mais. */
    private Completion jogo(User dono, LocalDate dia, int horas) {
        return Completion.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .user(dono)
                .game(Game.builder().id(UUID.randomUUID()).name("Jogo " + dia).build())
                .completedAt(dia)
                .hoursPlayed(BigDecimal.valueOf(horas))
                .status(CompletionStatus.APPROVED)
                .build();
    }

    @Test
    void cafeComLeiteUsaOPlacarDoDiaEmQueOJogoFoiZerado() {
        // 300h: 12 blocos de tempo valioso (24) + jogo fechado + primeiro na edicao = 26 pts.
        // O novato chega a 1/02 com uns 4 pts dos dois jogos de janeiro: 22 atras.
        Completion doLider = jogo(lider, LocalDate.of(2026, 1, 10), 300);
        Completion novatoAntes = jogo(novato, LocalDate.of(2026, 1, 5), 10);   // antes do lider pontuar
        Completion novatoMesmoDia = jogo(novato, LocalDate.of(2026, 1, 10), 10);
        Completion novatoDepois = jogo(novato, LocalDate.of(2026, 2, 1), 10);   // lider ja 20+ na frente
        // O novato cadastrou tudo depois (aprovado por ultimo) e fora de ordem.
        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId()))
                .thenReturn(List.of(doLider, novatoDepois, novatoMesmoDia, novatoAntes));

        service.recalculateEdition(edition);

        assertThat(doLider.isUnderdogAwarded()).isFalse();
        assertThat(novatoAntes.isUnderdogAwarded()).isFalse();
        assertThat(novatoMesmoDia.isUnderdogAwarded()).isFalse(); // mesmo dia nao conta
        assertThat(novatoDepois.isUnderdogAwarded()).isTrue();
    }

    @Test
    void cadastrarOHistoricoAtrasadoNaoDaCafeComLeiteEmTudo() {
        // Os dois jogaram o ano todo no mesmo ritmo; o novato so cadastrou tudo em outubro.
        Completion liderJan = jogo(lider, LocalDate.of(2026, 1, 15), 30);
        Completion liderMar = jogo(lider, LocalDate.of(2026, 3, 15), 30);
        Completion novatoJan = jogo(novato, LocalDate.of(2026, 1, 20), 30);
        Completion novatoMar = jogo(novato, LocalDate.of(2026, 3, 20), 30);
        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId()))
                .thenReturn(List.of(liderJan, liderMar, novatoJan, novatoMar));

        service.recalculateEdition(edition);

        assertThat(List.of(liderJan, liderMar, novatoJan, novatoMar))
                .noneMatch(Completion::isUnderdogAwarded);
    }

    @Test
    void ordemDeAprovacaoNaoMudaOResultado() {
        Completion doLider = jogo(lider, LocalDate.of(2026, 1, 10), 250);
        Completion doNovato = jogo(novato, LocalDate.of(2026, 2, 1), 10);

        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId())).thenReturn(List.of(doNovato, doLider));
        service.recalculateEdition(edition);
        boolean primeiraOrdem = doNovato.isUnderdogAwarded();

        when(completionRepository.listApprovedEntitiesByEditionId(edition.getId())).thenReturn(List.of(doLider, doNovato));
        service.recalculateEdition(edition);

        assertThat(primeiraOrdem).isTrue();
        assertThat(doNovato.isUnderdogAwarded()).isTrue();
    }

    private Completion completion(UUID coopGroupId) {
        return Completion.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .user(User.builder().id(UUID.randomUUID()).build())
                .game(game)
                .hoursPlayed(BigDecimal.TEN)
                .coop(coopGroupId != null)
                .coopPlayers(coopGroupId != null ? 2 : null)
                .coopGroupId(coopGroupId)
                .status(CompletionStatus.APPROVED)
                .build();
    }
}
