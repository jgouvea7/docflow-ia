package com.jonnathas.backend.document.dto;

import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.job.entity.Job;

import java.time.Instant;
import java.util.UUID;

public record DocumentResponse(
        UUID id,
        String fileName,
        long fileSize,
        String status,
        Instant uploadedAt,
        Instant completedAt,
        Integer progressPercentage,
        String errorMessage,
        UUID jobId
) {
    public static DocumentResponse from(Document document) {
        Job job = document.getJob();
        return new DocumentResponse(
                document.getId(),
                document.getFileName(),
                document.getFileSize(),
                document.getStatus().name(),
                document.getUploadedAt(),
                document.getCompletedAt(),
                document.getProgressPercentage(),
                document.getErrorMessage(),
                job != null ? job.getId() : null
        );
    }
}
