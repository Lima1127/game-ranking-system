package com.gameranking.domain.model;

import com.gameranking.domain.enums.CompletionStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "completions")
public class Completion extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "approved_by_user_id")
    private User approvedBy;

    @OneToOne(mappedBy = "completion")
    private PlatinumProof proof;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(name = "completed_at", nullable = false)
    private LocalDate completedAt;

    @Column(name = "hours_played", nullable = false, precision = 6, scale = 2)
    private BigDecimal hoursPlayed;

    @Column(name = "first_time_ever", nullable = false)
    private boolean firstTimeEver;

    @Column(name = "first_in_edition", nullable = false)
    private boolean firstInEdition;

    @Column(name = "completed_in_release_year", nullable = false)
    private boolean completedInReleaseYear;

    @Column(nullable = false)
    private boolean platinum;

    @Column(nullable = false)
    private boolean coop;

    @Column(name = "coop_players")
    private Integer coopPlayers;

    @Column(name = "hype_participation", nullable = false)
    private boolean hypeParticipation;

    @Column(name = "hype_completed_bonus", nullable = false)
    private boolean hypeCompletedBonus;

    @Column(name = "rotative_list", nullable = false)
    private boolean rotativeList;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CompletionStatus status;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;
}
