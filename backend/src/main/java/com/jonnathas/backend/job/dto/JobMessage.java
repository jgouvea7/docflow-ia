package com.jonnathas.backend.job.dto;

import java.util.UUID;

public record JobMessage(
        UUID jobId,
        UUID documentId
) {}
