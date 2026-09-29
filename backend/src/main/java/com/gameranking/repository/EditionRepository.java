package com.gameranking.repository;

import com.gameranking.domain.model.Edition;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.Optional;
import java.util.UUID;

public interface EditionRepository extends JpaRepository<Edition, UUID> {
    Optional<Edition> findByActiveTrue();

    /**
     * SELECT ... FOR UPDATE na edicao: serializa operacoes que calculam pontos
     * (aprovacoes, recalculo, exclusao), evitando bonus duplicados por concorrencia.
     */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select e from Edition e where e.id = :editionId")
    Optional<Edition> lockById(UUID editionId);
}
