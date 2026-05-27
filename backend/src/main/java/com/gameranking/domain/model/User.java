package com.gameranking.domain.model;

import com.gameranking.domain.enums.UserRole;
import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import java.time.OffsetDateTime;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "users")
public class User extends AuditableEntity {

    @Id
    private UUID id;

    @Column(name = "display_name", nullable = false, length = 120)
    private String displayName;

    @Column(nullable = false, unique = true, length = 180)
    private String email;

    @Column(name = "password_hash", nullable = false, length = 255)
    private String passwordHash;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private UserRole role;

    @Column(nullable = false)
    private Boolean active;

    @Column(name = "avatar_storage_key", length = 255)
    private String avatarStorageKey;

    @Column(name = "avatar_content_type", length = 120)
    private String avatarContentType;

    @Column(name = "avatar_file_size_bytes")
    private Long avatarFileSizeBytes;

    @Column(name = "avatar_uploaded_at")
    private OffsetDateTime avatarUploadedAt;
}
