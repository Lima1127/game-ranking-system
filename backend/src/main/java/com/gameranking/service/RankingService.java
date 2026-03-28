package com.gameranking.service;

import com.gameranking.common.exception.NotFoundException;
import com.gameranking.repository.EditionRepository;
import com.gameranking.repository.ScoreEventRepository;
import com.gameranking.web.dto.ranking.RankingRowResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RankingService {

    private final EditionRepository editionRepository;
    private final ScoreEventRepository scoreEventRepository;

    public List<RankingRowResponse> getRanking(UUID editionId) {
        UUID effectiveEditionId = editionId;
        if (effectiveEditionId == null) {
            effectiveEditionId = editionRepository.findByActiveTrue()
                    .orElseThrow(() -> new NotFoundException("Edicao ativa nao encontrada"))
                    .getId();
        }

        return scoreEventRepository.getRanking(effectiveEditionId);
    }
}
