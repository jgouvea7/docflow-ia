package com.jonnathas.backend.document.dto;

import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentContent;
import com.jonnathas.backend.job.entity.Job;

import java.time.Instant;
import java.util.UUID;

public record DocumentDetailResponse(
        UUID id,
        String fileName,
        Instant createdAt,
        Instant completedAt,
        String status,
        Integer progressPercentage,
        String errorMessage,
        String content,
        UUID jobId
) {
    public static DocumentDetailResponse from(Document document, DocumentContent content) {
        Job job = document.getJob();
        return new DocumentDetailResponse(
                document.getId(),
                document.getFileName(),
                document.getUploadedAt(),
                document.getCompletedAt(),
                document.getStatus().name(),
                document.getProgressPercentage(),
                document.getErrorMessage(),
                content != null ? content.getContent() : null,
                job != null ? job.getId() : null
        );
    }
}
