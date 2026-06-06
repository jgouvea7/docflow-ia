package com.jonnathas.backend.job.service;

import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentStatus;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import com.jonnathas.backend.job.dto.JobMessage;
import com.jonnathas.backend.job.dto.JobResponse;
import com.jonnathas.backend.job.entity.Job;
import com.jonnathas.backend.job.entity.JobStatus;
import com.jonnathas.backend.job.infrastructure.JobRepository;
import com.jonnathas.backend.job.infrastructure.RabbitMQConfig;
import com.jonnathas.backend.user.entity.User;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class JobService {

    private final JobRepository jobRepository;
    private final DocumentRepository documentRepository;
    private final RabbitTemplate rabbitTemplate;

    public JobService(
            JobRepository jobRepository,
            DocumentRepository documentRepository,
            RabbitTemplate rabbitTemplate
    ) {
        this.jobRepository = jobRepository;
        this.documentRepository = documentRepository;
        this.rabbitTemplate = rabbitTemplate;
    }

    @Transactional
    public Job createAndPublish(Document document) {
        Job job = new Job();
        job.setDocument(document);
        job.setStatus(JobStatus.PENDING);
        job.setAttempts(0);
        job.setProgressPercentage(0);
        job.setErrorMessage(null);

        Job savedJob = jobRepository.save(job);
        document.setJob(savedJob);
        documentRepository.save(document);

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.JOB_QUEUE,
                new JobMessage(
                        savedJob.getId(),
                        document.getId()
                )
        );

        return savedJob;
    }

    @Transactional(readOnly = true)
    public List<JobResponse> findAllForUser(User owner) {
        return jobRepository.findAllByDocument_Owner_IdOrderByCreatedAtDesc(owner.getId())
                .stream()
                .map(JobResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public JobResponse getOwnedJob(UUID jobId, User owner) {
        return jobRepository.findByIdAndDocument_Owner_Id(jobId, owner.getId())
                .map(JobResponse::from)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    @Transactional(readOnly = true)
    public Job getOwnedJobEntity(UUID jobId, User owner) {
        return jobRepository.findByIdAndDocument_Owner_Id(jobId, owner.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));
    }

    @Transactional
    public void deleteJob(UUID jobId, User owner) {
        Job job = getOwnedJobEntity(jobId, owner);
        Document document = job.getDocument();
        jobRepository.delete(job);
        document.setJob(null);
        documentRepository.save(document);
    }

    @Transactional
    public JobResponse updateStatus(UUID jobId, JobStatus status, Integer progressPercentage, String errorMessage) {
        Job job = jobRepository.findById(jobId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Job not found"));

        job.setStatus(status);
        job.setErrorMessage(errorMessage);

        if (progressPercentage != null) {
            job.setProgressPercentage(progressPercentage);
        } else if (status == JobStatus.PROCESSING) {
            job.setProgressPercentage(25);
        } else if (status == JobStatus.COMPLETED || status == JobStatus.FAILED) {
            job.setProgressPercentage(100);
        }

        if (status == JobStatus.PROCESSING && job.getStartedAt() == null) {
            job.setStartedAt(Instant.now());
        }

        if ((status == JobStatus.COMPLETED || status == JobStatus.FAILED) && job.getFinishedAt() == null) {
            job.setFinishedAt(Instant.now());
        }

        Job savedJob = jobRepository.save(job);

        documentRepository.findById(job.getDocument().getId()).ifPresent(document -> {
            document.setStatus(DocumentStatus.valueOf(status.name()));
            document.setProgressPercentage(savedJob.getProgressPercentage());
            document.setErrorMessage(savedJob.getErrorMessage());
            if (status == JobStatus.COMPLETED || status == JobStatus.FAILED) {
                document.setCompletedAt(savedJob.getFinishedAt());
            }
            documentRepository.save(document);
        });

        return JobResponse.from(savedJob);
    }
}
