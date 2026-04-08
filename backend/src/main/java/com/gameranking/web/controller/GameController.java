package com.gameranking.web.controller;

import com.gameranking.service.GameService;
import com.gameranking.web.dto.game.CreateGameRequest;
import com.gameranking.web.dto.game.GameResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/games")
@RequiredArgsConstructor
public class GameController {

    private final GameService gameService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public GameResponse create(@Valid @RequestBody CreateGameRequest request) {
        return gameService.create(request);
    }

    @GetMapping
    public List<GameResponse> list() {
        return gameService.list();
    }
}
