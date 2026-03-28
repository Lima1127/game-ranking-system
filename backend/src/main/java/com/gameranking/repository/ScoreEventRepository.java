package com.gameranking.repository;

import com.gameranking.domain.model.ScoreEvent;
import com.gameranking.web.dto.ranking.RankingRowResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.UUID;

public interface ScoreEventRepository extends JpaRepository<ScoreEvent, UUID> {

    @Query("""
            select new com.gameranking.web.dto.ranking.RankingRowResponse(
                se.user.id,
                se.user.displayName,
                coalesce(sum(se.points), 0),
                coalesce(sum(case when se.ruleCode = 'UNDERDOG_BONUS' then 1 else 0 end), 0)
            )
            from ScoreEvent se
            where se.edition.id = :editionId
            group by se.user.id, se.user.displayName
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
}
