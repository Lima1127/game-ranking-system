package com.gameranking.domain.model;

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
@Table(name = "global_goal_contributions")
public class GlobalGoalContribution {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "global_goal_id")
    private GlobalGoal globalGoal;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Column(name = "contribution_value", nullable = false, precision = 10, scale = 2)
    private BigDecimal contributionValue;

    @Column(length = 255)
    private String notes;

    @Column(name = "contributed_at", nullable = false)
    private OffsetDateTime contributedAt;
}
