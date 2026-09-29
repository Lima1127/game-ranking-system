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
