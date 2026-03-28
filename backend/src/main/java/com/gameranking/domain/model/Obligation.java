package com.gameranking.domain.model;

import com.gameranking.domain.enums.ObligationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "obligations")
public class Obligation {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @ManyToOne(optional = false)
    @JoinColumn(name = "assigned_by_user_id")
    private User assignedBy;

    @ManyToOne(optional = false)
    @JoinColumn(name = "assigned_to_user_id")
    private User assignedTo;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private ObligationStatus status;

    private Boolean accepted;

    private Boolean completed;

    @Column(name = "partial_hours", precision = 6, scale = 2)
    private BigDecimal partialHours;

    @ManyToOne
    @JoinColumn(name = "linked_completion_id")
    private Completion linkedCompletion;

    @Column(name = "penalty_points", nullable = false)
    private Integer penaltyPoints;

    @Column(name = "reward_points", nullable = false)
    private Integer rewardPoints;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;

    @Column(name = "resolved_at")
    private OffsetDateTime resolvedAt;
}
