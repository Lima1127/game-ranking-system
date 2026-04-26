package com.gameranking.repository;

import com.gameranking.domain.model.RotativeListEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RotativeListEntryRepository extends JpaRepository<RotativeListEntry, UUID> {

    @Query("""
            select entry
            from RotativeListEntry entry
            join fetch entry.game game
            where entry.edition.id = :editionId
              and entry.active = true
            order by entry.quarter asc, lower(game.name) asc
            """)
    List<RotativeListEntry> findActiveByEditionId(@Param("editionId") UUID editionId);

    boolean existsByEditionIdAndGameIdAndActiveTrue(UUID editionId, UUID gameId);

    Optional<RotativeListEntry> findByEditionIdAndQuarterAndGameId(UUID editionId, Short quarter, UUID gameId);

    Optional<RotativeListEntry> findByIdAndEditionId(UUID id, UUID editionId);

    List<RotativeListEntry> findAllByEditionIdAndGameIdAndActiveTrue(UUID editionId, UUID gameId);

    @Query("""
            select coalesce(max(entry.quarter), 0)
            from RotativeListEntry entry
            where entry.edition.id = :editionId
            """)
    short findMaxQuarterByEditionId(@Param("editionId") UUID editionId);
}
