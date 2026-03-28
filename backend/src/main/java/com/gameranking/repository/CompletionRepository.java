package com.gameranking.repository;

import com.gameranking.domain.model.Completion;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface CompletionRepository extends JpaRepository<Completion, UUID> {
    boolean existsByEditionIdAndGameId(UUID editionId, UUID gameId);
    boolean existsByUserIdAndGameId(UUID userId, UUID gameId);
}
