package com.jonnathas.backend.entity;

import java.util.UUID;

public record JobMessage(
        Long jobId,
        UUID documentId
) {}
