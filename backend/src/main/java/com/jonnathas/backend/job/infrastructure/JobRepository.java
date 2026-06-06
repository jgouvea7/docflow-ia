package com.jonnathas.backend.job.infrastructure;

import com.jonnathas.backend.job.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface JobRepository extends JpaRepository<Job, UUID> {
    Optional<Job> findByDocument_Id(UUID documentId);

    Optional<Job> findByIdAndDocument_Owner_Id(UUID id, UUID ownerId);

    List<Job> findAllByDocument_Owner_IdOrderByCreatedAtDesc(UUID ownerId);
}
