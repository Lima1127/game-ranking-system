package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.Genre;
import com.gameranking.repository.GameRepository;
import com.gameranking.repository.GenreRepository;
import com.gameranking.repository.UserRepository;
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
    private final UserRepository userRepository;

    @Transactional
    public GameResponse create(UUID requesterId, CreateGameRequest request) {
        boolean requesterIsAdmin = requesterId != null && userRepository.findById(requesterId)
                .map(user -> user.getRole() == UserRole.ADMIN)
                .orElse(false);
        return toResponse(findOrCreate(request, requesterIsAdmin ? request.releaseYear() : null));
    }

    /**
     * Um nome = um jogo (sem diferenciar maiusculas nem o ano). Antes, o mesmo nome com outro
     * ano gerava um segundo jogo, permitindo registrar o "mesmo" jogo duas vezes.
     */
    @Transactional
    public Game findOrCreate(CreateGameRequest request, Integer releaseYear) {
        String name = request.name().trim();
        return gameRepository.findFirstByNameIgnoreCase(name)
                .orElseGet(() -> createGame(name, releaseYear, request));
    }

    @Transactional
    public GameResponse updateReleaseYear(UUID requesterId, UUID gameId, Integer releaseYear) {
        boolean requesterIsAdmin = userRepository.findById(requesterId)
                .map(user -> user.getRole() == UserRole.ADMIN)
                .orElse(false);
        if (!requesterIsAdmin) {
            throw new BusinessException("Apenas usuarios ADMIN podem definir o ano de lancamento");
        }

        Game game = getById(gameId);
        game.setReleaseYear(releaseYear);
        return toResponse(game);
    }

    private Game createGame(String name, Integer releaseYear, CreateGameRequest request) {
        Set<Genre> genres = request.genres().stream()
                .map(this::findOrCreateGenre)
                .collect(Collectors.toSet());

        Game game = Game.builder()
                .id(UUID.randomUUID())
                .name(name)
                .releaseYear(releaseYear)
                .estimatedHoursMain(request.estimatedHoursMain())
                .estimatedHoursPlatinum(request.estimatedHoursPlatinum())
                .genres(genres)
                .build();

        return gameRepository.save(game);
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
