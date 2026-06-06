package com.jonnathas.backend.document.dto;

import java.util.UUID;

public record UploadResponse(
        UUID documentId,
        UUID jobId,
        String status
) {
}
