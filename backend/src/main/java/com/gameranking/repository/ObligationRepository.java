package com.gameranking.repository;

import com.gameranking.domain.enums.ObligationStatus;
import com.gameranking.domain.model.Completion;
import com.gameranking.domain.model.Obligation;
import com.gameranking.web.dto.obligation.ObligationItemResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ObligationRepository extends JpaRepository<Obligation, UUID> {
    long countByEditionIdAndAssignedByIdAndSlotConsumedTrue(UUID editionId, UUID assignedById);

    boolean existsByEditionIdAndAssignedToIdAndGameIdAndStatusIn(UUID editionId, UUID assignedToId, UUID gameId, List<ObligationStatus> statuses);

    Optional<Obligation> findFirstByEditionIdAndAssignedToIdAndGameIdAndStatusOrderByCreatedAtAsc(
            UUID editionId,
            UUID assignedToId,
            UUID gameId,
            ObligationStatus status
    );

    Optional<Obligation> findFirstByEditionIdAndAssignedToIdAndGameIdAndStatusInOrderByCreatedAtAsc(
            UUID editionId,
            UUID assignedToId,
            UUID gameId,
            List<ObligationStatus> statuses
    );

    List<Obligation> findByLinkedCompletion(Completion completion);

    @Query("""
            select new com.gameranking.web.dto.obligation.ObligationItemResponse(
                o.id,
                o.edition.id,
                o.assignedBy.id,
                o.assignedBy.displayName,
                o.assignedTo.id,
                o.assignedTo.displayName,
                o.game.id,
                o.game.name,
                o.status,
                o.accepted,
                o.completed,
                o.partialHours,
                o.linkedCompletion.id,
                o.penaltyPoints,
                o.rewardPoints,
                o.createdAt,
                o.resolvedAt
            )
            from Obligation o
            where o.edition.id = :editionId
            order by o.createdAt desc
            """)
    List<ObligationItemResponse> listByEditionId(UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.obligation.ObligationItemResponse(
                o.id,
                o.edition.id,
                o.assignedBy.id,
                o.assignedBy.displayName,
                o.assignedTo.id,
                o.assignedTo.displayName,
                o.game.id,
                o.game.name,
                o.status,
                o.accepted,
                o.completed,
                o.partialHours,
                o.linkedCompletion.id,
                o.penaltyPoints,
                o.rewardPoints,
                o.createdAt,
                o.resolvedAt
            )
            from Obligation o
            where o.edition.id = :editionId
              and (o.assignedBy.id = :userId or o.assignedTo.id = :userId)
            order by o.createdAt desc
            """)
    List<ObligationItemResponse> listByEditionIdAndParticipantId(UUID editionId, UUID userId);
}
