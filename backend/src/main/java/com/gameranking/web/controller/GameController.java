package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.GameService;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.game.GameResponse;
import com.gameranking.web.dto.game.SteamAppSummaryResponse;
import com.gameranking.web.dto.game.SteamGameSuggestionResponse;
import com.gameranking.web.dto.game.UpdateGameReleaseYearRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameResponse create(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody CreateGameRequest request
    ) {
        return gameService.create(currentUser.userId(), request);
    }

    @GetMapping
    public List<GameResponse> list() {
        return gameService.list();
    }

    // Sugestoes da loja Steam para o campo "Jogo" (lista vazia se a Steam nao responder).
    @GetMapping("/steam-search")
    public List<SteamGameSuggestionResponse> searchSteam(@RequestParam(defaultValue = "") String term) {
        return gameService.searchSteam(term);
    }

    // Ano de lancamento de um jogo da Steam escolhido na sugestao (404 se a Steam nao responder).
    @GetMapping("/steam-apps/{steamAppId}")
    public SteamAppSummaryResponse steamAppSummary(@PathVariable int steamAppId) {
        return gameService.steamAppSummary(steamAppId);
    }

    @PatchMapping("/{gameId}/release-year")
    public GameResponse updateReleaseYear(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID gameId,
            @Valid @RequestBody UpdateGameReleaseYearRequest request
    ) {
        return gameService.updateReleaseYear(currentUser.userId(), gameId, request.releaseYear());
    }
}
