package com.gameranking.domain.model;

import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Column;
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
@Table(name = "rotative_source_games")
public class RotativeSourceGame {

    @Id
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "edition_id")
    private Edition edition;

    @ManyToOne(optional = false)
    @JoinColumn(name = "game_id")
    private Game game;

    @Column(name = "created_at", nullable = false)
    private OffsetDateTime createdAt;
}
