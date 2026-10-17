package com.gameranking.service;

import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.service.scoring.CafeComLeite;
import com.gameranking.service.scoring.ScoringEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class EditionScoreRecalculationService {

    public record RecalculationResult(int processedCompletions, int regeneratedScoreEvents) {}

    private final CompletionRepository completionRepository;
    private final EditionRepository editionRepository;
    private final ScoreEventRepository scoreEventRepository;
    private final ScoringEngine scoringEngine;

    @Transactional
    public RecalculationResult recalculateEdition(Edition edition) {
        editionRepository.lockById(edition.getId());
        List<Completion> approvedCompletions = completionRepository.listApprovedEntitiesByEditionId(edition.getId());

        scoreEventRepository.deleteByEditionIdAndSourceType(edition.getId(), ScoreSourceType.COMPLETION);

        // Jogo -> "dono" do primeiro registro aprovado (grupo coop ou registro individual).
        // Membros do mesmo grupo coop compartilham o bonus de primeiro na edicao.
        Map<UUID, UUID> firstOwnerByGame = new HashMap<>();
        int regeneratedEvents = 0;

        // 1) Primeiro na edicao: continua pela ordem de aprovacao.
        for (Completion completion : approvedCompletions) {
            UUID owner = firstInEditionOwner(completion);
            UUID firstOwner = firstOwnerByGame.putIfAbsent(completion.getGame().getId(), owner);
            boolean firstInEdition = firstOwner == null || firstOwner.equals(owner);
            completion.setFirstInEdition(firstInEdition);
        }

        // 2) Cafe com leite: refeito pelo placar do dia em que cada jogo foi zerado, do mais antigo
        // para o mais novo (os pontos de um dia entram no placar dos dias seguintes).
        // Eventos que sobraram (obrigacoes) tambem contam, cada um no seu dia.
        List<ScoreEvent> placarDaEdicao = new ArrayList<>(scoreEventRepository.findAllByEditionIdWithCompletion(edition.getId()));
        Map<LocalDate, List<Completion>> porDia = new LinkedHashMap<>();
        approvedCompletions.stream()
                .sorted(Comparator.comparing(Completion::getCompletedAt, Comparator.nullsLast(Comparator.naturalOrder())))
                .forEach(completion -> porDia.computeIfAbsent(
                        completion.getCompletedAt() == null ? LocalDate.MAX : completion.getCompletedAt(),
                        dia -> new ArrayList<>()).add(completion));

        for (Map.Entry<LocalDate, List<Completion>> dia : porDia.entrySet()) {
            Map<UUID, Long> placar = CafeComLeite.placarAntesDe(placarDaEdicao, dia.getKey());
            List<ScoreEvent> eventosDoDia = new ArrayList<>();
            for (Completion completion : dia.getValue()) {
                boolean cafeComLeite = CafeComLeite.temDireito(placar, completion.getUser().getId());
                completion.setUnderdogAwarded(cafeComLeite);

                List<ScoreEvent> events = scoringEngine.buildCompletionEvents(
                        completion,
                        edition,
                        completion.getUser(),
                        cafeComLeite
                );
                scoreEventRepository.saveAll(events);
                eventosDoDia.addAll(events);
                regeneratedEvents += events.size();
            }
            placarDaEdicao.addAll(eventosDoDia);
        }

        return new RecalculationResult(approvedCompletions.size(), regeneratedEvents);
    }

    static UUID firstInEditionOwner(Completion completion) {
        return completion.getCoopGroupId() != null ? completion.getCoopGroupId() : completion.getId();
    }
}
