package com.gameranking.service;

import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.service.scoring.ScoringEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EditionScoreRecalculationService {

    public record RecalculationResult(int processedCompletions, int regeneratedScoreEvents) {}

    private final CompletionRepository completionRepository;
    private final ScoreEventRepository scoreEventRepository;
    private final ScoringEngine scoringEngine;

    @Transactional
    public RecalculationResult recalculateEdition(Edition edition) {
        List<Completion> approvedCompletions = completionRepository.listApprovedEntitiesByEditionId(edition.getId());

        scoreEventRepository.deleteByEditionIdAndSourceType(edition.getId(), ScoreSourceType.COMPLETION);

        Set<java.util.UUID> firstGames = new HashSet<>();
        int regeneratedEvents = 0;

        for (Completion completion : approvedCompletions) {
            boolean firstInEdition = firstGames.add(completion.getGame().getId());
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
}
