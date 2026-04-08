package com.gameranking.web.dto.game;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

public record CreateGameRequest(
        @NotBlank @Size(max = 180) String name,
        @NotNull @Min(1970) @Max(2100) Integer releaseYear,
        BigDecimal estimatedHoursMain,
        BigDecimal estimatedHoursPlatinum,
        @NotEmpty Set<@NotBlank @Size(max = 60) String> genres
) {
}
