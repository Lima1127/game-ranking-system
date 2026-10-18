package com.gameranking.domain.enums;

/** Resultado da conferencia de um registro na Steam (ver V23__completion_steam_checks.sql). */
public enum SteamCheckStatus {
    OK,
    PRIVATE_PROFILE,
    NOT_OWNED,
    NO_STEAM_ACCOUNT,
    NO_STEAM_GAME,
    NOT_CONFIGURED,
    UNAVAILABLE
}
