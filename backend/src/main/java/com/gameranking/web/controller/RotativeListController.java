package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.RotativeListService;
import com.gameranking.service.RotativeSteamListService;
import com.gameranking.web.dto.rotative.RotativeListEntryResponse;
import com.gameranking.web.dto.rotative.RotativeListGenerationResponse;
import com.gameranking.web.dto.rotative.RotativeListSourceUploadResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/rotative-list")
@RequiredArgsConstructor
public class RotativeListController {

    private final RotativeListService rotativeListService;
    private final RotativeSteamListService rotativeSteamListService;

    // A equipe recebe tambem as tags marcadas em vermelho; os demais jogadores, nao.
    @GetMapping
    public List<RotativeListEntryResponse> list(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return rotativeListService.list(currentUser.userId(), editionId);
    }

    /** Sorteia uma lista nova da Steam (22 com 1400+ avaliacoes e 8 com 1000 a 1399), substituindo a atual. */
    @PostMapping("/steam-draw")
    public RotativeListGenerationResponse drawFromSteam(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return rotativeSteamListService.drawNewList(currentUser.userId(), editionId);
    }

    /** Troca um jogo da lista ativa por outro sorteado da mesma faixa de avaliacoes. */
    @PostMapping("/{entryId}/reroll")
    public RotativeListEntryResponse reroll(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @PathVariable UUID entryId
    ) {
        return rotativeSteamListService.reroll(currentUser.userId(), entryId);
    }

    @PostMapping("/source-file")
    @ResponseStatus(HttpStatus.CREATED)
    public RotativeListSourceUploadResponse uploadSourceFile(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam("file") MultipartFile file,
            @RequestParam(required = false) UUID editionId
    ) {
        return rotativeListService.uploadSourceFile(currentUser.userId(), file, editionId);
    }

    @PostMapping("/generate-next")
    public RotativeListGenerationResponse generateNext(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @RequestParam(required = false) UUID editionId
    ) {
        return rotativeListService.generateNextList(currentUser.userId(), editionId);
    }
}

