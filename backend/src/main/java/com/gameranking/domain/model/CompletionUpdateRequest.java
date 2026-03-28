package com.gameranking.domain.model;

import com.gameranking.domain.enums.CompletionUpdateStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

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
@Table(name = "completion_update_requests")
public class CompletionUpdateRequest extends AuditableEntity {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "completion_id")
    private Completion completion;

    @ManyToOne(optional = false)
    @JoinColumn(name = "requested_by_user_id")
    private User requestedBy;

    @ManyToOne
    @JoinColumn(name = "approved_by_user_id")
    private User approvedBy;

    @Column(name = "completed_at", nullable = false)
    private LocalDate completedAt;

    @Column(name = "hours_played", nullable = false, precision = 6, scale = 2)
    private BigDecimal hoursPlayed;

    @Column(name = "first_time_ever", nullable = false)
    private boolean firstTimeEver;

    @Column(name = "completed_in_release_year", nullable = false)
    private boolean completedInReleaseYear;

    @Column(nullable = false)
    private boolean platinum;

    @Column(name = "proof_id")
    private UUID proofId;

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
    private CompletionUpdateStatus status;

    @Column(name = "approved_at")
    private OffsetDateTime approvedAt;

    @Column(name = "cancelled_at")
    private OffsetDateTime cancelledAt;
}
