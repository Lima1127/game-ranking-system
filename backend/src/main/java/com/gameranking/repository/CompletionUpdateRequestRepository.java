package com.gameranking.repository;

import com.gameranking.domain.model.CompletionUpdateRequest;
import com.gameranking.domain.enums.CompletionUpdateStatus;
import com.gameranking.web.dto.completion.CompletionUpdateRequestResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompletionUpdateRequestRepository extends JpaRepository<CompletionUpdateRequest, UUID> {
    boolean existsByCompletionIdAndStatus(UUID completionId, CompletionUpdateStatus status);
    Optional<CompletionUpdateRequest> findByIdAndCompletionEditionId(UUID updateRequestId, UUID editionId);

    interface UpdateRequestProjection {
        java.util.UUID getId();
        java.util.UUID getCompletionId();
        java.util.UUID getUserId();
        String getUserDisplayName();
        String getGameName();
        java.time.LocalDate getCompletedAt();
        java.math.BigDecimal getHoursPlayed();
        boolean isPlatinum();
        CompletionUpdateStatus getStatus();
        java.time.OffsetDateTime getCreatedAt();
        java.time.OffsetDateTime getApprovedAt();
        java.util.UUID getProofId();
        boolean isFromObligation();
    }

    @Query("""
            select 
                u.id as id,
                u.completion.id as completionId,
                u.requestedBy.id as userId,
                u.requestedBy.displayName as userDisplayName,
                u.completion.game.name as gameName,
                u.completedAt as completedAt,
                u.hoursPlayed as hoursPlayed,
                u.platinum as platinum,
                u.status as status,
                u.createdAt as createdAt,
                u.approvedAt as approvedAt,
                u.proofId as proofId,
                u.completion.fromObligation as fromObligation
            from CompletionUpdateRequest u
            where u.completion.edition.id = :editionId
            order by u.createdAt desc
            """)
    List<UpdateRequestProjection> listByEditionId(UUID editionId);

    @Query("""
            select 
                u.id as id,
                u.completion.id as completionId,
                u.requestedBy.id as userId,
                u.requestedBy.displayName as userDisplayName,
                u.completion.game.name as gameName,
                u.completedAt as completedAt,
                u.hoursPlayed as hoursPlayed,
                u.platinum as platinum,
                u.status as status,
                u.createdAt as createdAt,
                u.approvedAt as approvedAt,
                u.proofId as proofId,
                u.completion.fromObligation as fromObligation
            from CompletionUpdateRequest u
            where u.completion.edition.id = :editionId
              and u.requestedBy.id = :userId
            order by u.createdAt desc
            """)
    List<UpdateRequestProjection> listByEditionIdAndUserId(UUID editionId, UUID userId);
}
