package com.gameranking.repository;

import com.gameranking.domain.enums.ScoreSourceType;
import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.web.dto.ranking.RankingRowResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ScoreEventRepository extends JpaRepository<ScoreEvent, UUID> {

    interface CompletionRuleProjection {
        UUID getCompletionId();
        String getRuleCode();
    }

    interface CompletionPointsProjection {
        UUID getCompletionId();
        Long getTotalPoints();
    }

    @Query("""
            select new com.gameranking.web.dto.ranking.RankingRowResponse(
                se.user.id,
                se.user.displayName,
                coalesce(sum(se.points), 0),
                coalesce(sum(case when se.ruleCode = 'UNDERDOG_BONUS' then 1 else 0 end), 0),
                case when se.user.avatarStorageKey is not null then true else false end,
                se.user.avatarUploadedAt
            )
            from ScoreEvent se
            where se.edition.id = :editionId
            group by se.user.id, se.user.displayName, se.user.avatarStorageKey, se.user.avatarUploadedAt
            order by coalesce(sum(se.points), 0) desc
            """)
    List<RankingRowResponse> getRanking(UUID editionId);

    @Query("""
            select coalesce(sum(se.points), 0)
            from ScoreEvent se
            where se.edition.id = :editionId
              and se.user.id = :userId
            """)
    Long getTotalPointsForUser(UUID editionId, UUID userId);

    @Query("""
            select
                se.completion.id as completionId,
                se.ruleCode as ruleCode
            from ScoreEvent se
            where se.completion.id in :completionIds
            order by se.createdAt asc
            """)
    List<CompletionRuleProjection> listRuleCodesByCompletionIds(List<UUID> completionIds);

    @Query("""
            select
                se.completion.id as completionId,
                coalesce(sum(se.points), 0) as totalPoints
            from ScoreEvent se
            where se.completion.id in :completionIds
            group by se.completion.id
            """)
    List<CompletionPointsProjection> listPointsByCompletionIds(List<UUID> completionIds);

    @Query("""
            select coalesce(sum(se.points), 0)
            from ScoreEvent se
            where se.completion.id = :completionId
            """)
    Long getTotalPointsForCompletion(UUID completionId);

    @Modifying
    @Query("""
            delete from ScoreEvent se
            where se.completion.id = :completionId
            """)
    void deleteByCompletionId(UUID completionId);

    @Modifying
    @Query("""
            delete from ScoreEvent se
            where se.obligation.id = :obligationId
            """)
    void deleteByObligationId(UUID obligationId);

    @Modifying
    @Query("""
            delete from ScoreEvent se
            where se.edition.id = :editionId
              and se.sourceType = :sourceType
            """)
    void deleteByEditionIdAndSourceType(UUID editionId, ScoreSourceType sourceType);
}
