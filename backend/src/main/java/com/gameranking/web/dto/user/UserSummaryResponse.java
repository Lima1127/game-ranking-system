package com.gameranking.web.dto.user;

import java.util.UUID;

public record UserSummaryResponse(
        UUID id,
        String displayName
) {
}
