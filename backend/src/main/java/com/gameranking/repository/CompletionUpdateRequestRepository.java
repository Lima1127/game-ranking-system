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

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionUpdateRequestResponse(
                u.id,
                u.completion.id,
                u.requestedBy.id,
                u.requestedBy.displayName,
                u.completion.game.name,
                u.completedAt,
                u.hoursPlayed,
                u.platinum,
                u.status,
                u.createdAt,
                u.approvedAt,
                u.proofId,
                null
            )
            from CompletionUpdateRequest u
            where u.completion.edition.id = :editionId
            order by u.createdAt desc
            """)
    List<CompletionUpdateRequestResponse> listByEditionId(UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionUpdateRequestResponse(
                u.id,
                u.completion.id,
                u.requestedBy.id,
                u.requestedBy.displayName,
                u.completion.game.name,
                u.completedAt,
                u.hoursPlayed,
                u.platinum,
                u.status,
                u.createdAt,
                u.approvedAt,
                u.proofId,
                null
            )
            from CompletionUpdateRequest u
            where u.completion.edition.id = :editionId
              and u.requestedBy.id = :userId
            order by u.createdAt desc
            """)
    List<CompletionUpdateRequestResponse> listByEditionIdAndUserId(UUID editionId, UUID userId);
}
