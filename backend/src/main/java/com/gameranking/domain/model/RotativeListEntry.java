package com.gameranking.domain.model;

import com.gameranking.domain.enums.RotativeReviewBand;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "rotative_list_entries")
public class RotativeListEntry {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @Column(nullable = false)
    private Short quarter;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(nullable = false)
    private Boolean active;

    // Sorteio da Steam (null em listas montadas por arquivo).
    @Enumerated(EnumType.STRING)
    @Column(name = "review_band", length = 20)
    private RotativeReviewBand reviewBand;

    @Column(name = "steam_review_count")
    private Integer steamReviewCount;

    // Tags marcadas em vermelho, separadas por virgula (so os admins veem).
    @Column(name = "flagged_tags", length = 200)
    private String flaggedTags;

    // Preenchidos quando o jogo entrou por "Sortear outro" (destaque para o admin).
    @Column(name = "replaced_game_name", length = 180)
    private String replacedGameName;

    @Column(name = "rerolled_at")
    private java.time.OffsetDateTime rerolledAt;
}
