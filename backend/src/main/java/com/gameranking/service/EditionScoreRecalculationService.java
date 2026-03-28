package com.gameranking.service;

import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.service.scoring.ScoringEngine;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

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

        scoreEventRepository.deleteByEditionId(edition.getId());

        Map<UUID, Long> pointsByUser = new HashMap<>();
        Set<UUID> firstGames = new HashSet<>();
        int regeneratedEvents = 0;

        for (Completion completion : approvedCompletions) {
            boolean firstInEdition = firstGames.add(completion.getGame().getId());
            completion.setFirstInEdition(firstInEdition);

            long userCurrentScore = pointsByUser.getOrDefault(completion.getUser().getId(), 0L);
            long leaderScore = pointsByUser.values().stream().mapToLong(Long::longValue).max().orElse(0L);
            boolean underdogBonus = leaderScore - userCurrentScore >= 20;

            List<ScoreEvent> events = scoringEngine.buildCompletionEvents(completion, edition, completion.getUser(), underdogBonus);
            scoreEventRepository.saveAll(events);

            long gainedPoints = events.stream().mapToInt(ScoreEvent::getPoints).sum();
            pointsByUser.merge(completion.getUser().getId(), gainedPoints, Long::sum);
            regeneratedEvents += events.size();
        }

        return new RecalculationResult(approvedCompletions.size(), regeneratedEvents);
    }
}
