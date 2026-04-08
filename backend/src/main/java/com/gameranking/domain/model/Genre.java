package com.gameranking.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "genres")
public class Genre {

    @Id
    private UUID id;

    @Column(nullable = false, unique = true, length = 60)
    private String name;
}
