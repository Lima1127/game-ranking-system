package com.gameranking.domain.model;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "admin_audit_logs")
public class AdminAuditLog {

    @Id
    private UUID id;

    @Column(name = "actor_user_id", nullable = false)
    private UUID actorUserId;

    @Column(name = "actor_display_name", nullable = false, length = 120)
    private String actorDisplayName;

    @Column(name = "actor_role", nullable = false, length = 20)
    private String actorRole;

    @Column(name = "action_code", nullable = false, length = 50)
    private String actionCode;

    @Column(name = "subject_completion_id")
    private UUID subjectCompletionId;

    @Column(name = "subject_user_id")
    private UUID subjectUserId;

    @Column(name = "subject_display_name", length = 120)
    private String subjectDisplayName;

    @Column(name = "game_name", length = 180)
    private String gameName;

    @Column(columnDefinition = "TEXT")
    private String details;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
