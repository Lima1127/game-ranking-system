package com.gameranking.web.dto.edition;

import java.time.LocalDate;

/**
 * O que a tela "Virada de edicao" mostra antes do Fundador confirmar.
 * Pendencias que BLOQUEIAM: pedidos de registro, pedidos de atualizacao e obrigacoes em revisao.
 * Obrigacoes abertas (pendentes/aceitas) NAO bloqueiam: sao encerradas sem penalidade na virada.
 */
public record EditionRolloverPreviewResponse(
        EditionResponse currentEdition,
        long pendingCompletions,
        long pendingUpdateRequests,
        long obligationsUnderReview,
        long openObligationsToClose,
        boolean canRollover,
        String suggestedName,
        Integer suggestedYear,
        LocalDate suggestedStartsAt,
        LocalDate suggestedEndsAt
) {
}
