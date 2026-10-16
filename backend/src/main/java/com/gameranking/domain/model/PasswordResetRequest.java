package com.gameranking.domain.model;

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

import java.time.OffsetDateTime;
import java.util.UUID;

/** Pedido de redefinicao de senha aprovado por um admin com um codigo (ver PasswordResetService). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "password_reset_requests")
public class PasswordResetRequest {

    public enum Status { PENDING, APPROVED, USED, REJECTED, CANCELLED }

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Status status;

    @Column(name = "code_hash", length = 64)
    private String codeHash;

    @Column(name = "code_expires_at")
    private OffsetDateTime codeExpiresAt;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts;

    @Column(name = "requested_at", nullable = false)
    private OffsetDateTime requestedAt;

    @ManyToOne
    @JoinColumn(name = "decided_by_user_id")
    private User decidedBy;

    @Column(name = "decided_at")
    private OffsetDateTime decidedAt;

    @Column(name = "used_at")
    private OffsetDateTime usedAt;
}
