package com.gameranking.web.dto.edition;

import com.gameranking.domain.model.Edition;

import java.time.LocalDate;
import java.util.UUID;

public record EditionResponse(
        UUID id,
        String name,
        Integer year,
        LocalDate startsAt,
        LocalDate endsAt,
        boolean active
) {
    public static EditionResponse from(Edition edition) {
        return new EditionResponse(
                edition.getId(),
                edition.getName(),
                edition.getYear(),
                edition.getStartsAt(),
                edition.getEndsAt(),
                Boolean.TRUE.equals(edition.getActive())
        );
    }
}
