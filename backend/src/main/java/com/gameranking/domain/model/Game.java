package com.gameranking.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "games")
public class Game extends AuditableEntity {

    @Id
    private UUID id;

    @Column(nullable = false, length = 180)
    private String name;

    @Column(name = "release_year", nullable = false)
    private Integer releaseYear;

    @Column(name = "estimated_hours_main", precision = 6, scale = 2)
    private BigDecimal estimatedHoursMain;

    @Column(name = "estimated_hours_platinum", precision = 6, scale = 2)
    private BigDecimal estimatedHoursPlatinum;

    @ManyToMany
    @JoinTable(
            name = "game_genres",
            joinColumns = @JoinColumn(name = "game_id"),
            inverseJoinColumns = @JoinColumn(name = "genre_id")
    )
    @Builder.Default
    private Set<Genre> genres = new HashSet<>();
}
