package com.gameranking.web.dto.obligation;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record SubmitObligationReviewRequest(
        @NotBlank String outcome,
        @DecimalMin("0.0") BigDecimal partialHours
) {
}
