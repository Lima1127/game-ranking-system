package com.gameranking.web.controller;

import com.gameranking.security.AuthenticatedUser;
import com.gameranking.service.EditionService;
import com.gameranking.web.dto.edition.EditionResponse;
import com.gameranking.web.dto.edition.EditionRolloverPreviewResponse;
import com.gameranking.web.dto.edition.EditionRolloverRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/v1")
@RequiredArgsConstructor
public class EditionController {

    private final EditionService editionService;

    /** Todas as edicoes, da mais nova para a mais antiga (seletor do ranking). */
    @GetMapping("/editions")
    public List<EditionResponse> list() {
        return editionService.list();
    }

    @GetMapping("/admin/editions/rollover-preview")
    public EditionRolloverPreviewResponse preview(@AuthenticationPrincipal AuthenticatedUser currentUser) {
        return editionService.preview(currentUser.userId());
    }

    @PostMapping("/admin/editions/rollover")
    public EditionResponse rollover(
            @AuthenticationPrincipal AuthenticatedUser currentUser,
            @Valid @RequestBody EditionRolloverRequest request
    ) {
        return editionService.rollover(currentUser.userId(), request);
    }
}
