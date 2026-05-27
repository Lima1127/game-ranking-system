package com.gameranking.web.dto.obligation;

import java.util.List;

public record ObligationOverviewResponse(
        int availableAssignments,
        List<ObligationItemResponse> items
) {
}
