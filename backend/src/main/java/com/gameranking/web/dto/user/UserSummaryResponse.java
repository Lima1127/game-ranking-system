package com.gameranking.web.dto.user;

import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String displayName,
        // SteamID do perfil vinculado (null = sem vinculo). Texto: 17 digitos nao cabem num numero do JavaScript.
        String steamId
) {
}
