package com.gameranking.web.dto.rotative;

public record RotativeListSourceUploadResponse(
        int importedLines,
        int totalUniqueGamesInSource
) {
}

