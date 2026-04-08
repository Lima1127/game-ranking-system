package com.gameranking.service.scoring;

import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.domain.model.User;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Component
public class ScoringEngine {

    public List<ScoreEvent> buildCompletionEvents(Completion completion, Edition edition, User user, boolean underdogBonus) {
        List<ScoreEvent> events = new ArrayList<>();

        events.add(event(edition, user, completion, "GAME_COMPLETED", 1, "Jogo fechado"));

        if (completion.isFirstTimeEver()) {
            events.add(event(edition, user, completion, "FIRST_EXPERIENCE", 1, "Primeira experiencia"));
        }

        if (completion.isFirstInEdition()) {
            events.add(event(edition, user, completion, "FIRST_IN_EDITION", 1, "Primeiro no Reviradao"));
        }

        if (completion.isCompletedInReleaseYear()) {
            events.add(event(edition, user, completion, "IN_RELEASE_YEAR", 1, "Em dia"));
        }

        int blocks = completion.getHoursPlayed().divide(BigDecimal.valueOf(25), 0, java.math.RoundingMode.DOWN).intValue();
        for (int i = 0; i < blocks; i++) {
            events.add(event(edition, user, completion, "TIME_VALUABLE_BLOCK", 2, "Tempo valioso (25h)"));
        }

        if (completion.isPlatinum()) {
            events.add(event(edition, user, completion, "PLATINUM", 3, "Platina de jogo"));
        }

        if (completion.isCoop() && completion.getCoopPlayers() != null && completion.getCoopPlayers() <= 4) {
            events.add(event(edition, user, completion, "COOP_RIGHT_HAND", 2, "Braco Direito"));
        }

        if (completion.isHypeParticipation()) {
            events.add(event(edition, user, completion, "HYPE_PARTICIPATION", 1, "Participacao no Hype"));
        }

        if (completion.isHypeCompletedBonus()) {
            events.add(event(edition, user, completion, "HYPE_COMPLETION_BONUS", 2, "Bonus por completar Hype"));
        }

        if (completion.isRotativeList()) {
            events.add(event(edition, user, completion, "ROTATIVE_LIST_BONUS", 3, "Bonus lista rotativa"));
        }

        if (underdogBonus) {
            events.add(event(edition, user, completion, "UNDERDOG_BONUS", 3, "Cafe com leite"));
        }

        return events;
    }

    private ScoreEvent event(Edition edition, User user, Completion completion, String ruleCode, int points, String reason) {
        return ScoreEvent.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .user(user)
                .completion(completion)
                .sourceType(ScoreSourceType.COMPLETION)
                .ruleCode(ruleCode)
                .points(points)
                .reason(reason)
                .createdAt(OffsetDateTime.now())
                .build();
    }
}
