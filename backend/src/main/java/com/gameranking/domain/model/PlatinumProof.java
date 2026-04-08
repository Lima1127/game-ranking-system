package com.gameranking.domain.model;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;
import java.util.UUID;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "platinum_proofs")
public class PlatinumProof {

    @Id
    private UUID id;

    @OneToOne
    @JoinColumn(name = "completion_id", unique = true)
    private Completion completion;

    @Column(name = "storage_key", nullable = false, length = 255)
    private String storageKey;

    @Column(name = "content_type", nullable = false, length = 120)
    private String contentType;

    @Column(name = "file_size_bytes", nullable = false)
    private Long fileSizeBytes;

    @Column(name = "sha256", nullable = false, length = 64)
    private String sha256;

    @Column(name = "uploaded_at", nullable = false)
    private OffsetDateTime uploadedAt;
}
