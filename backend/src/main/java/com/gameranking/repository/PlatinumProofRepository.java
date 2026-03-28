package com.gameranking.repository;

import com.gameranking.domain.model.PlatinumProof;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface PlatinumProofRepository extends JpaRepository<PlatinumProof, UUID> {
}
