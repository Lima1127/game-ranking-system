package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.model.Edition;

import java.time.LocalDate;

/**
 * Regra do Reviradao: a data de conclusao precisa estar dentro do periodo da edicao
 * e nao pode estar no futuro.
 */
final class CompletionDateRules {

    private CompletionDateRules() {
    }

    static void validate(Edition edition, LocalDate completedAt, LocalDate today) {
        if (completedAt == null) {
            throw new BusinessException("Informe a data de conclusao");
        }

        LocalDate latestAllowed = edition.getEndsAt().isBefore(today) ? edition.getEndsAt() : today;
        if (completedAt.isBefore(edition.getStartsAt()) || completedAt.isAfter(latestAllowed)) {
            throw new BusinessException(
                    "A data de conclusao deve estar entre " + edition.getStartsAt() + " e " + latestAllowed
                            + " (periodo da edicao " + edition.getName() + ")"
            );
        }
    }

    static void validate(Edition edition, LocalDate completedAt) {
        validate(edition, completedAt, LocalDate.now());
    }
}
