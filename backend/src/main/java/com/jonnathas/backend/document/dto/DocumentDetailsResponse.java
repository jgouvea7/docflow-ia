package com.jonnathas.backend.document.dto;

import java.time.Instant;
import java.util.UUID;

public record DocumentDetailsResponse(
        UUID id,
        String fileName,
        Instant uploadedAt,
        String status,
        String content
) {}
