package com.jonnathas.backend.job.dto;

import com.jonnathas.backend.job.entity.Job;
import com.jonnathas.backend.job.entity.JobStatus;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

public record JobResponse(
        UUID jobId,
        UUID documentId,
        String fileName,
        JobStatus status,
        int attempts,
        Instant createdAt,
        Instant startedAt,
        Instant finishedAt,
        Integer progressPercentage,
        String errorMessage,
        Long processingDurationSeconds
) {
    public static JobResponse from(Job job) {
        Long durationSeconds = null;
        if (job.getStartedAt() != null && job.getFinishedAt() != null) {
            durationSeconds = Duration.between(job.getStartedAt(), job.getFinishedAt()).toSeconds();
        }

        return new JobResponse(
                job.getId(),
                job.getDocument().getId(),
                job.getDocument().getFileName(),
                job.getStatus(),
                job.getAttempts(),
                job.getCreatedAt(),
                job.getStartedAt(),
                job.getFinishedAt(),
                job.getProgressPercentage(),
                job.getErrorMessage(),
                durationSeconds
        );
    }
}
