package com.gameranking.domain.model;

import com.gameranking.domain.enums.RotativeReviewBand;
import jakarta.persistence.Column;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class RotativeListEntryTest {

    @Test
    void todasAsVagasCabemNaColunaDoBanco() throws Exception {
        // A coluna nasceu com 10 caracteres e a vaga CURRENT_YEAR (12) quebrava o sorteio ao gravar.
        int length = RotativeListEntry.class.getDeclaredField("reviewBand").getAnnotation(Column.class).length();

        for (RotativeReviewBand band : RotativeReviewBand.values()) {
            assertThat(band.name().length()).as(band.name()).isLessThanOrEqualTo(length);
        }
    }
}
