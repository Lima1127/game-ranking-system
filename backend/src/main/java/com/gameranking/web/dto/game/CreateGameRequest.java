package com.gameranking.web.dto.game;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.Set;

/**
 * releaseYear e opcional e so e aceito quando enviado por um ADMIN
 * (ver GameService.create); para os demais usuarios o jogo nasce sem ano.
 */
public record CreateGameRequest(
        @NotBlank @Size(max = 180) String name,
        @Min(1970) @Max(2100) Integer releaseYear,
        BigDecimal estimatedHoursMain,
        BigDecimal estimatedHoursPlatinum,
        @NotEmpty Set<@NotBlank @Size(max = 60) String> genres
) {
}
