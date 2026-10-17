package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.SteamAccountService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/steam")
@RequiredArgsConstructor
public class SteamAccountController {

    private final SteamAccountService steamAccountService;

    /** Devolve o endereco do login da Steam; o site leva a pessoa para la na mesma aba. */
    @PostMapping("/link/start")
    public Map<String, String> startLink(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return Map.of("redirectUrl", steamAccountService.startLink(currentUser.userId()));
    }

    @DeleteMapping("/link")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void unlink(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        steamAccountService.unlink(currentUser.userId());
    }

    /**
     * Retorno do login da Steam (publico: o navegador chega aqui vindo da Steam, sem o token do site).
     * Sempre termina mandando a pessoa de volta para a tela Menu com o resultado.
     */
    @GetMapping("/callback")
    public ResponseEntity<Void> callback(@RequestParam Map<String, String> params) {
        SteamAccountService.LinkResult result;
        try {
            result = steamAccountService.completeLink(params);
        } catch (RuntimeException ex) {
            log.error("Erro ao concluir o vinculo com a Steam", ex);
            result = SteamAccountService.LinkResult.NOT_CONFIRMED;
        }
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(steamAccountService.screenUrlFor(result)))
                .build();
    }
}
