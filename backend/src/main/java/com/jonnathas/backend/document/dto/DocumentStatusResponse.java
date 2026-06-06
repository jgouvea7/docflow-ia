package com.jonnathas.backend.document.dto;

import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.job.entity.Job;

import java.time.Instant;
import java.util.UUID;

public record DocumentStatusResponse(
        UUID documentId,
        UUID jobId,
        String status,
        Integer progressPercentage,
        Instant startedAt,
        Instant finishedAt,
        String errorMessage
) {
    public static DocumentStatusResponse from(Document document, Job job) {
        return new DocumentStatusResponse(
                document.getId(),
                job != null ? job.getId() : null,
                document.getStatus().name(),
                document.getProgressPercentage(),
                job != null ? job.getStartedAt() : null,
                job != null ? job.getFinishedAt() : null,
                document.getErrorMessage()
        );
    }
}
