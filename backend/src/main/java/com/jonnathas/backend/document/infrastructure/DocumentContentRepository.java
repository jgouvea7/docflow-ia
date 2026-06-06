package com.jonnathas.backend.document.infrastructure;

import com.jonnathas.backend.document.entity.DocumentContent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface DocumentContentRepository extends JpaRepository<DocumentContent, UUID> {
	Optional<DocumentContent> findByDocument_Id(UUID documentId);
}
