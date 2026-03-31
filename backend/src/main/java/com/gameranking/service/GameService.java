package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.Genre;
import com.gameranking.repository.GameRepository;
import com.gameranking.repository.GenreRepository;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.game.GameResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameService {

    private final GameRepository gameRepository;
    private final GenreRepository genreRepository;

    @Transactional
    public GameResponse create(CreateGameRequest request) {
        Game existingGame = gameRepository.findByNameIgnoreCaseAndReleaseYear(request.name(), request.releaseYear())
                .orElse(null);

        if (existingGame != null) {
            return toResponse(existingGame);
        }

        Set<Genre> genres = request.genres().stream()
                .map(this::findOrCreateGenre)
                .collect(Collectors.toSet());

        Game game = Game.builder()
                .id(UUID.randomUUID())
                .name(request.name())
                .releaseYear(request.releaseYear())
                .estimatedHoursMain(request.estimatedHoursMain())
                .estimatedHoursPlatinum(request.estimatedHoursPlatinum())
                .genres(genres)
                .build();

        Game saved = gameRepository.save(game);
        return toResponse(saved);
    }

    @Transactional(readOnly = true)
    public List<GameResponse> list() {
        return gameRepository.findAll().stream().map(this::toResponse).toList();
    }

    public Game getById(UUID id) {
        return gameRepository.findById(id).orElseThrow(() -> new NotFoundException("Jogo nao encontrado"));
    }

    private Genre findOrCreateGenre(String name) {
        return genreRepository.findByNameIgnoreCase(name)
                .orElseGet(() -> genreRepository.save(Genre.builder().id(UUID.randomUUID()).name(name).build()));
    }

    private GameResponse toResponse(Game game) {
        return new GameResponse(
                game.getId(),
                game.getName(),
                game.getReleaseYear(),
                game.getGenres().stream().map(Genre::getName).collect(Collectors.toSet())
        );
    }
}
