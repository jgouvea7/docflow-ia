package com.jonnathas.backend.infrastructure;

import com.jonnathas.backend.entity.Job;
import org.springframework.data.jpa.repository.JpaRepository;

public interface JobRepository extends JpaRepository<Job, Long> {
}
