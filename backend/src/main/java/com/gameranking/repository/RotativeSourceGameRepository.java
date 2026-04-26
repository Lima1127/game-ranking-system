package com.gameranking.repository;

import com.gameranking.domain.model.RotativeSourceGame;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface RotativeSourceGameRepository extends JpaRepository<RotativeSourceGame, UUID> {

    @Query("""
            select source.game.id
            from RotativeSourceGame source
            where source.edition.id = :editionId
            """)
    List<UUID> listGameIdsByEditionId(UUID editionId);

    Optional<RotativeSourceGame> findByEditionIdAndGameId(UUID editionId, UUID gameId);
}

