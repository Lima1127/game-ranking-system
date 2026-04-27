package com.gameranking.repository;

import com.gameranking.domain.model.Completion;
import com.gameranking.domain.enums.CompletionStatus;
import com.gameranking.web.dto.admin.AdminCompletionItemResponse;
import com.gameranking.web.dto.completion.CompletionDetailsResponse;
import com.gameranking.web.dto.completion.CompletionListItemResponse;
import com.gameranking.web.dto.completion.CompletionRequestResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface CompletionRepository extends JpaRepository<Completion, UUID> {
    boolean existsByEditionIdAndGameIdAndStatus(UUID editionId, UUID gameId, CompletionStatus status);
    boolean existsByUserIdAndGameId(UUID userId, UUID gameId);
    boolean existsByUserIdAndGameIdAndStatus(UUID userId, UUID gameId, CompletionStatus status);
    Optional<Completion> findByIdAndEditionId(UUID completionId, UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionListItemResponse(
                c.id,
                c.user.id,
                c.user.displayName,
                c.game.id,
                c.game.name,
                c.completedAt,
                c.hoursPlayed,
                c.platinum
            )
            from Completion c
            where c.edition.id = :editionId
              and c.status = com.gameranking.domain.enums.CompletionStatus.APPROVED
            order by c.user.displayName asc, c.completedAt desc, c.createdAt desc
            """)
    List<CompletionListItemResponse> listByEditionId(UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionRequestResponse(
                c.id,
                c.user.id,
                c.user.displayName,
                c.game.id,
                c.game.name,
                c.completedAt,
                c.hoursPlayed,
                c.platinum,
                c.status,
                c.createdAt,
                c.approvedAt,
                p.id,
                p.contentType,
                c.coopGroupId
            )
            from Completion c
            left join c.proof p
            where c.edition.id = :editionId
            order by c.createdAt desc
            """)
    List<CompletionRequestResponse> listRequestsByEditionId(UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionRequestResponse(
                c.id,
                c.user.id,
                c.user.displayName,
                c.game.id,
                c.game.name,
                c.completedAt,
                c.hoursPlayed,
                c.platinum,
                c.status,
                c.createdAt,
                c.approvedAt,
                p.id,
                p.contentType,
                c.coopGroupId
            )
            from Completion c
            left join c.proof p
            where c.edition.id = :editionId
              and c.user.id = :userId
            order by c.createdAt desc
            """)
    List<CompletionRequestResponse> listRequestsByEditionIdAndUserId(UUID editionId, UUID userId);

    @Query("""
            select new com.gameranking.web.dto.admin.AdminCompletionItemResponse(
                c.id,
                c.user.id,
                c.user.displayName,
                c.game.id,
                c.game.name,
                c.completedAt,
                c.hoursPlayed,
                c.platinum,
                c.status,
                c.createdAt,
                c.approvedAt,
                c.cancelledAt,
                p.id,
                p.contentType
            )
            from Completion c
            left join c.proof p
            order by c.createdAt desc
            """)
    List<AdminCompletionItemResponse> listAdminItems();

    @Query("""
            select c
            from Completion c
            where c.edition.id = :editionId
              and c.status = com.gameranking.domain.enums.CompletionStatus.APPROVED
            order by c.approvedAt asc, c.createdAt asc, c.id asc
            """)
    List<Completion> listApprovedEntitiesByEditionId(UUID editionId);

    @Query("""
            select new com.gameranking.web.dto.completion.CompletionDetailsResponse(
                c.id,
                c.user.id,
                c.user.displayName,
                c.game.id,
                c.game.name,
                c.completedAt,
                c.hoursPlayed,
                c.firstTimeEver,
                c.completedInReleaseYear,
                c.platinum,
                c.coop,
                c.coopPlayers,
                c.hypeParticipation,
                c.hypeCompletedBonus,
                c.rotativeList,
                c.notes,
                c.status,
                p.id,
                p.contentType
            )
            from Completion c
            left join c.proof p
            where c.id = :completionId
            """)
    Optional<CompletionDetailsResponse> findDetailsById(UUID completionId);

    @Query("""
            select distinct c.game.id
            from Completion c
            where c.edition.id = :editionId
              and c.status = com.gameranking.domain.enums.CompletionStatus.APPROVED
            """)
    List<UUID> listApprovedGameIdsByEditionId(UUID editionId);
}



