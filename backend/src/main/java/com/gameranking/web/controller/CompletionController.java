package com.gameranking.web.controller;

import com.gameranking.service.CompletionService;
import com.gameranking.web.dto.completion.CompletionResponse;
import com.gameranking.web.dto.completion.CreateCompletionRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/completions")
@RequiredArgsConstructor
public class CompletionController {

    private final CompletionService completionService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public CompletionResponse create(
            @RequestHeader("X-User-Id") UUID userId,
            @Valid @RequestBody CreateCompletionRequest request
    ) {
        return completionService.create(userId, request);
    }
}
