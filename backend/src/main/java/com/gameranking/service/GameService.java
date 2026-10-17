package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.common.exception.NotFoundException;
import com.gameranking.domain.enums.UserRole;
import com.gameranking.domain.model.Game;
import com.gameranking.domain.model.Genre;
import com.gameranking.repository.GameRepository;
import com.gameranking.repository.GenreRepository;
import com.gameranking.repository.UserRepository;
import com.gameranking.service.steam.SteamAppDetails;
import com.gameranking.service.steam.SteamStoreClient;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.game.GameResponse;
import com.gameranking.web.dto.game.SteamAppSummaryResponse;
import com.gameranking.web.dto.game.SteamGameSuggestionResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GameService {

    static final int MIN_STEAM_SEARCH_LENGTH = 2;
    static final int MAX_STEAM_SEARCH_LENGTH = 100;

    private final GameRepository gameRepository;
    private final GenreRepository genreRepository;
    private final UserRepository userRepository;
    private final SteamStoreClient steamStoreClient;

    @Transactional
    public GameResponse create(UUID requesterId, CreateGameRequest request) {
        boolean requesterIsAdmin = requesterId != null && userRepository.findById(requesterId)
                .map(user -> user.getRole().isStaff())
                .orElse(false);
        return toResponse(findOrCreate(request, requesterIsAdmin ? request.releaseYear() : null));
    }

    /**
     * Um nome = um jogo (sem diferenciar maiusculas nem o ano). Antes, o mesmo nome com outro
     * ano gerava um segundo jogo, permitindo registrar o "mesmo" jogo duas vezes.
     */
    @Transactional
    public Game findOrCreate(CreateGameRequest request, Integer releaseYear) {
        if (request.steamAppId() != null) {
            Optional<Game> fromSteam = findOrCreateFromSteam(request);
            if (fromSteam.isPresent()) {
                return fromSteam.get();
            }
        }

        String name = request.name().trim();
        return gameRepository.findFirstByNameIgnoreCase(name)
                .orElseGet(() -> createGame(name, releaseYear, null, request.genres(), request));
    }

    /**
     * Jogo escolhido entre as sugestoes da Steam. O nome oficial e o ano de lancamento vem da
     * propria Steam (consultada aqui no servidor), por isso o ano e aceito mesmo quando quem
     * cadastra nao e admin. Se a Steam nao reconhecer o appId ou nao responder, devolve vazio
     * e o jogo segue o cadastro normal pelo nome digitado.
     */
    private Optional<Game> findOrCreateFromSteam(CreateGameRequest request) {
        Optional<Game> linkedGame = gameRepository.findBySteamAppId(request.steamAppId());
        if (linkedGame.isPresent()) {
            return linkedGame;
        }

        return steamStoreClient.fetchAppDetails(request.steamAppId())
                .map(details -> gameRepository.findFirstByNameIgnoreCase(details.name())
                        .map(existingGame -> linkToSteam(existingGame, details))
                        .orElseGet(() -> createGame(
                                details.name(),
                                details.releaseYear(),
                                details.appId(),
                                details.genres().isEmpty() ? request.genres() : Set.copyOf(details.genres()),
                                request
                        )));
    }

    /**
     * Jogo que ja existia pelo nome (cadastrado antes da Steam): ganha o vinculo e, se ainda
     * nao tiver, o ano de lancamento. Um ano definido por admin nunca e sobrescrito.
     */
    private Game linkToSteam(Game game, SteamAppDetails details) {
        if (game.getSteamAppId() == null) {
            game.setSteamAppId(details.appId());
            if (game.getReleaseYear() == null) {
                game.setReleaseYear(details.releaseYear());
            }
        }
        return game;
    }

    /**
     * Sugestoes da loja Steam para o campo "Jogo". Sem @Transactional de proposito: a chamada
     * a Steam pode demorar alguns segundos e nao deve segurar uma conexao do banco.
     */
    public List<SteamGameSuggestionResponse> searchSteam(String term) {
        String trimmedTerm = term == null ? "" : term.trim();
        if (trimmedTerm.length() < MIN_STEAM_SEARCH_LENGTH || trimmedTerm.length() > MAX_STEAM_SEARCH_LENGTH) {
            return List.of();
        }

        return steamStoreClient.search(trimmedTerm).stream()
                .map(suggestion -> new SteamGameSuggestionResponse(
                        suggestion.appId(),
                        suggestion.name(),
                        suggestion.imageUrl(),
                        gameRepository.findBySteamAppId(suggestion.appId())
                                .or(() -> gameRepository.findFirstByNameIgnoreCase(suggestion.name()))
                                .map(Game::getId)
                                .orElse(null)
                ))
                .toList();
    }

    @Transactional
    public GameResponse updateReleaseYear(UUID requesterId, UUID gameId, Integer releaseYear) {
        boolean requesterIsAdmin = userRepository.findById(requesterId)
                .map(user -> user.getRole().isStaff())
                .orElse(false);
        if (!requesterIsAdmin) {
            throw new BusinessException("Apenas usuarios ADMIN podem definir o ano de lancamento");
        }

        Game game = getById(gameId);
        game.setReleaseYear(releaseYear);
        return toResponse(game);
    }

    private Game createGame(String name, Integer releaseYear, Integer steamAppId, Set<String> genreNames, CreateGameRequest request) {
        Set<Genre> genres = genreNames.stream()
                .map(this::findOrCreateGenre)
                .collect(Collectors.toSet());

        Game game = Game.builder()
                .id(UUID.randomUUID())
                .name(name)
                .releaseYear(releaseYear)
                .steamAppId(steamAppId)
                .estimatedHoursMain(request.estimatedHoursMain())
                .estimatedHoursPlatinum(request.estimatedHoursPlatinum())
                .genres(genres)
                .build();

        return gameRepository.save(game);
    }

    /**
     * Ano de lancamento de um jogo da Steam ainda fora do catalogo (escolhido na sugestao).
     * Sem @Transactional: so consulta a Steam (com cache), nao o banco.
     */
    public SteamAppSummaryResponse steamAppSummary(int steamAppId) {
        return steamStoreClient.fetchAppDetails(steamAppId)
                .map(details -> new SteamAppSummaryResponse(details.appId(), details.name(), details.releaseYear()))
                .orElseThrow(() -> new NotFoundException("Jogo nao encontrado na Steam"));
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
                game.getGenres().stream().map(Genre::getName).collect(Collectors.toSet()),
                game.getSteamAppId()
        );
    }
}
