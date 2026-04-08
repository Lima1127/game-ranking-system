package com.gameranking.web.controller;

import com.gameranking.service.RankingService;
import com.gameranking.web.dto.ranking.RankingRowResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/ranking")
@RequiredArgsConstructor
public class RankingController {

    private final RankingService rankingService;

    @GetMapping
    public List<RankingRowResponse> get(@RequestParam(required = false) UUID editionId) {
        return rankingService.getRanking(editionId);
    }
}
