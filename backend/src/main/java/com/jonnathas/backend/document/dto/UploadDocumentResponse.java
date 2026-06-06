package com.jonnathas.backend.document.dto;

import java.util.UUID;

public record UploadDocumentResponse(
        UUID documentId,
        UUID jobId
) {
}
