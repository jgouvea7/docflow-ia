package com.jonnathas.backend.job.dto;

import com.jonnathas.backend.job.entity.JobStatus;
import jakarta.validation.constraints.NotNull;

public record JobStatusUpdateRequest(
        @NotNull JobStatus status,
        Integer progressPercentage,
        String errorMessage
) {
}
