package com.gameranking.repository;

import com.gameranking.domain.model.PlatinumProof;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface PlatinumProofRepository extends JpaRepository<PlatinumProof, UUID> {
    Optional<PlatinumProof> findByCompletionId(UUID completionId);
}
