package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Edition;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.domain.model.User;
import com.gameranking.repository.CompletionRepository;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.scoring.ScoringEngine;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class CompletionService {

    private final CompletionRepository completionRepository;
    private final EditionRepository editionRepository;
    private final UserRepository userRepository;
    private final GameService gameService;
    private final ScoreEventRepository scoreEventRepository;
    private final ScoringEngine scoringEngine;
    private final PlatinumProofService platinumProofService;

    @Transactional
    public CompletionResponse create(UUID userId, CreateCompletionRequest request) {
        Edition edition = editionRepository.findByActiveTrue()
                .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"));

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Usuario nao encontrado"));

        Game game = gameService.getById(request.gameId());

        if (request.platinum() && request.platinumProofId() == null) {
            throw new BusinessException("Platina exige comprovante de imagem");
        }

        if (!request.coop() && request.coopPlayers() != null) {
            throw new BusinessException("Quantidade de jogadores cooperativos so deve ser informada quando coop for verdadeiro");
        }

        if (request.coop() && request.coopPlayers() == null) {
            throw new BusinessException("Informe quantidade de jogadores para cooperativo");
        }

        boolean firstInEdition = !completionRepository.existsByEditionIdAndGameId(edition.getId(), game.getId());

        Completion completion = Completion.builder()
                .id(UUID.randomUUID())
                .edition(edition)
                .user(user)
                .game(game)
                .completedAt(request.completedAt() == null ? LocalDate.now() : request.completedAt())
                .hoursPlayed(request.hoursPlayed())
                .firstTimeEver(request.firstTimeEver())
                .firstInEdition(firstInEdition)
                .completedInReleaseYear(request.completedInReleaseYear())
                .platinum(request.platinum())
                .coop(request.coop())
                .coopPlayers(request.coopPlayers())
                .hypeParticipation(request.hypeParticipation())
                .hypeCompletedBonus(request.hypeCompletedBonus())
                .rotativeList(request.rotativeList())
                .notes(request.notes())
                .build();

        Completion saved = completionRepository.save(completion);

        if (request.platinum() && request.platinumProofId() != null) {
            platinumProofService.attachToCompletion(request.platinumProofId(), saved);
        }

        Long userCurrentScore = scoreEventRepository.getTotalPointsForUser(edition.getId(), user.getId());
        Long leaderScore = scoreEventRepository.getRanking(edition.getId()).stream()
                .mapToLong(row -> row.totalPoints() == null ? 0L : row.totalPoints())
                .max()
                .orElse(0L);
        boolean underdogBonus = leaderScore != null
                && userCurrentScore != null
                && leaderScore - userCurrentScore >= 20;

        List<ScoreEvent> events = scoringEngine.buildCompletionEvents(saved, edition, user, underdogBonus);
        scoreEventRepository.saveAll(events);

        int total = events.stream().mapToInt(ScoreEvent::getPoints).sum();

        return new CompletionResponse(saved.getId(), user.getId(), game.getId(), total);
    }
}
