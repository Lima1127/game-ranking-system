package com.gameranking.domain.model;

import com.fasterxml.jackson.databind.JsonNode;
import com.gameranking.domain.enums.ScoreSourceType;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "score_events")
public class ScoreEvent {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @ManyToOne(optional = false)
    @JoinColumn(name = "user_id")
    private User user;

    @ManyToOne
    @JoinColumn(name = "completion_id")
    private Completion completion;

    @ManyToOne
    @JoinColumn(name = "obligation_id")
    private Obligation obligation;

    @Enumerated(EnumType.STRING)
    @Column(name = "source_type", nullable = false, length = 30)
    private ScoreSourceType sourceType;

    @Column(name = "rule_code", nullable = false, length = 50)
    private String ruleCode;

    @Column(nullable = false)
    private Integer points;

    @Column(nullable = false, length = 255)
    private String reason;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(columnDefinition = "jsonb")
    private JsonNode metadata;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
