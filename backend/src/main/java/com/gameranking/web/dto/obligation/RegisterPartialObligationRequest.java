package com.gameranking.web.dto.obligation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record RegisterPartialObligationRequest(
        @NotNull
        @DecimalMin("0.0")
        BigDecimal partialHours
) {
}
