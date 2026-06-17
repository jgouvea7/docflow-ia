package com.jonnathas.backend.document.dto;

import java.util.UUID;

public record EmbeddingSavedResponse(
        UUID documentId,
        int chunksSaved
) {
}
