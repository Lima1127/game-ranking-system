package com.gameranking.domain.model;

import com.gameranking.domain.enums.SteamCheckStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.OffsetDateTime;
import java.util.UUID;

/** O que a Steam informava sobre o jogo de um registro na ultima conferencia (ver SteamVerificationService). */
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Entity
@Table(name = "completion_steam_checks")
public class CompletionSteamCheck {

    @Id
    @Column(name = "completion_id")
    private UUID completionId;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SteamCheckStatus status;

    @Column(name = "steam_id", length = 20)
    private String steamId;

    @Column(name = "steam_app_id")
    private Integer steamAppId;

    @Column(name = "playtime_minutes")
    private Integer playtimeMinutes;

    @Column(name = "achievements_total")
    private Integer achievementsTotal;

    @Column(name = "achievements_unlocked")
    private Integer achievementsUnlocked;

    @Column(name = "last_unlock_at")
    private OffsetDateTime lastUnlockAt;

    @Column(name = "checked_at", nullable = false)
    private OffsetDateTime checkedAt;
}
