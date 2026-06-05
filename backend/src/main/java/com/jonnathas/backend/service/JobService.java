package com.jonnathas.backend.service;

import com.jonnathas.backend.config.RabbitMQConfig;
import com.jonnathas.backend.entity.Job;
import com.jonnathas.backend.entity.JobMessage;
import com.jonnathas.backend.entity.Status;
import com.jonnathas.backend.infrastructure.JobRepository;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
public class JobService {

    @Autowired
    private JobRepository jobRepository;

    @Autowired
    private RabbitTemplate rabbitTemplate;

    public Job createAndPublish(UUID documentId) {
        Job job = new Job();

        job.setDocumentId(documentId);
        job.setStatus(Status.PENDING);
        job.setAttempts(0);

        Job savedJob = jobRepository.save(job);

        rabbitTemplate.convertAndSend(
                RabbitMQConfig.JOB_QUEUE,
                new JobMessage(
                        savedJob.getId(),
                        documentId
                )
        );

        return savedJob;
    }

}
