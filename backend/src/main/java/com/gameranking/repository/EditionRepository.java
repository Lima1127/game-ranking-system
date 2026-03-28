package com.gameranking.repository;

import com.gameranking.domain.model.Edition;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EditionRepository extends JpaRepository<Edition, UUID> {
    Optional<Edition> findByActiveTrue();
}
