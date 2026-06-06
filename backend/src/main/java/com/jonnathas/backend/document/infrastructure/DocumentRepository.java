package com.jonnathas.backend.document.infrastructure;

import com.jonnathas.backend.document.entity.Document;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface DocumentRepository extends JpaRepository<Document, UUID> {
    List<Document> findAllByOwner_IdOrderByUploadedAtDesc(UUID ownerId);

    Optional<Document> findByIdAndOwner_Id(UUID id, UUID ownerId);
}
