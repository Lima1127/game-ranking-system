package com.gameranking.service;

import com.gameranking.common.exception.BusinessException;
import com.gameranking.domain.model.Edition;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class CompletionDateRulesTest {

    private final Edition edition = Edition.builder()
            .name("Reviradao 2026")
            .startsAt(LocalDate.of(2026, 1, 1))
            .endsAt(LocalDate.of(2026, 12, 31))
            .build();
    private final LocalDate today = LocalDate.of(2026, 9, 28);

    @Test
    void aceitaDatasDentroDaEdicaoAteHoje() {
        assertThatCode(() -> CompletionDateRules.validate(edition, LocalDate.of(2026, 1, 1), today)).doesNotThrowAnyException();
        assertThatCode(() -> CompletionDateRules.validate(edition, today, today)).doesNotThrowAnyException();
    }

    @Test
    void recusaDataAntesDaEdicaoNoFuturoOuAusente() {
        assertThatThrownBy(() -> CompletionDateRules.validate(edition, LocalDate.of(2025, 12, 31), today))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> CompletionDateRules.validate(edition, today.plusDays(1), today))
                .isInstanceOf(BusinessException.class);
        assertThatThrownBy(() -> CompletionDateRules.validate(edition, null, today))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    void depoisDoFimDaEdicaoOLimiteEhOFimDaEdicao() {
        LocalDate afterEdition = LocalDate.of(2027, 2, 1);
        assertThatCode(() -> CompletionDateRules.validate(edition, LocalDate.of(2026, 12, 31), afterEdition)).doesNotThrowAnyException();
        assertThatThrownBy(() -> CompletionDateRules.validate(edition, LocalDate.of(2027, 1, 5), afterEdition))
                .isInstanceOf(BusinessException.class);
    }
}
