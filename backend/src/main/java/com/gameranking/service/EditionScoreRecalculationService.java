package com.gameranking.service;

import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.service.scoring.ScoringEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
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

        for (Completion completion : approvedCompletions) {
            UUID owner = firstInEditionOwner(completion);
            UUID firstOwner = firstOwnerByGame.putIfAbsent(completion.getGame().getId(), owner);
            boolean firstInEdition = firstOwner == null || firstOwner.equals(owner);
            completion.setFirstInEdition(firstInEdition);

            List<ScoreEvent> events = scoringEngine.buildCompletionEvents(
                    completion,
                    edition,
                    completion.getUser(),
                    completion.isUnderdogAwarded()
            );
            scoreEventRepository.saveAll(events);
            regeneratedEvents += events.size();
        }

        return new RecalculationResult(approvedCompletions.size(), regeneratedEvents);
    }

    static UUID firstInEditionOwner(Completion completion) {
        return completion.getCoopGroupId() != null ? completion.getCoopGroupId() : completion.getId();
    }
}
