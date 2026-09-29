package com.gameranking.web.dto.game;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateGameReleaseYearRequest(
        @NotNull @Min(1970) @Max(2100) Integer releaseYear
) {
}
