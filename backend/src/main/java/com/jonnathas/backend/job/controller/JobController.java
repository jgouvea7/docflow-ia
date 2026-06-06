package com.jonnathas.backend.job.controller;

import com.jonnathas.backend.job.dto.JobResponse;
import com.jonnathas.backend.job.dto.JobStatusUpdateRequest;
import com.jonnathas.backend.job.service.JobService;
import com.jonnathas.backend.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("api/v1/jobs")
public class JobController {

    private final JobService jobService;

    public JobController(JobService jobService) {
        this.jobService = jobService;
    }

    @GetMapping
    public ResponseEntity<List<JobResponse>> listJobs(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(jobService.findAllForUser(user));
    }

    @GetMapping("/{jobId}")
    public ResponseEntity<JobResponse> getJob(
            @PathVariable("jobId") UUID jobId,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(jobService.getOwnedJob(jobId, user));
    }

    @DeleteMapping("/{jobId}")
    public ResponseEntity<Void> deleteJob(
            @PathVariable("jobId") UUID jobId,
            @AuthenticationPrincipal User user
    ) {
        jobService.deleteJob(jobId, user);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{jobId}/status")
    public ResponseEntity<JobResponse> updateStatus(
            @PathVariable("jobId") UUID jobId,
            @Valid @RequestBody JobStatusUpdateRequest request
    ) {
        JobResponse updatedJob = jobService.updateStatus(
                jobId,
                request.status(),
                request.progressPercentage(),
                request.errorMessage()
        );
        return ResponseEntity.ok(updatedJob);
    }
}
