package com.gameranking.web.dto.edition;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.time.LocalDate;
import java.util.UUID;

/**
 * currentEditionId: a edicao que a tela mostrou como atual. Se outra pessoa ja tiver feito a virada
 * (ou o botao for clicado duas vezes), o id nao bate e nada acontece.
 */
public record EditionRolloverRequest(
        @NotNull UUID currentEditionId,
        @NotBlank @Size(max = 80) String name,
        @NotNull Integer year,
        @NotNull LocalDate startsAt,
        @NotNull LocalDate endsAt
) {
}
