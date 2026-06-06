package com.jonnathas.backend.document.service;

import com.jonnathas.backend.document.dto.DocumentDetailResponse;
import com.jonnathas.backend.document.dto.DocumentResponse;
import com.jonnathas.backend.document.dto.DocumentStatusResponse;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentContent;
import com.jonnathas.backend.document.entity.DocumentStatus;
import com.jonnathas.backend.document.infrastructure.DocumentContentRepository;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import com.jonnathas.backend.job.entity.Job;
import com.jonnathas.backend.job.infrastructure.JobRepository;
import com.jonnathas.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentService {

    private final Path uploadRoot;
    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;
    private final JobRepository jobRepository;

    public DocumentService(
            @Value("${app.storage.upload-dir}") String uploadDir,
            DocumentRepository documentRepository,
            DocumentContentRepository documentContentRepository,
            JobRepository jobRepository
    ) {
        this.uploadRoot = Paths.get(uploadDir);
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
        this.jobRepository = jobRepository;
    }

    @Transactional
    public Document createDocument(User owner, MultipartFile file) {
        String originalFilename = Optional.ofNullable(file.getOriginalFilename()).orElse("document");
        String safeFilename = Paths.get(originalFilename).getFileName().toString();

        Document document = new Document();
        document.setOwner(owner);
        document.setFileName(safeFilename);
        document.setFilePath(uploadRoot.toString());
        document.setFileSize(file.getSize());
        document.setStatus(DocumentStatus.PENDING);
        document.setProgressPercentage(0);
        document.setErrorMessage(null);
        document.setCompletedAt(null);

        Document savedDocument = documentRepository.save(document);

        Path storedPath = uploadRoot.resolve(savedDocument.getId() + "_" + safeFilename);
        try {
            Files.createDirectories(uploadRoot);
            file.transferTo(storedPath);
        } catch (IOException ex) {
            documentRepository.delete(savedDocument);
            throw new IllegalStateException("Failed to store uploaded file", ex);
        }

        savedDocument.setFilePath(storedPath.toString());
        return documentRepository.save(savedDocument);
    }

    @Transactional(readOnly = true)
    public List<DocumentResponse> findAllForUser(User owner) {
        return documentRepository.findAllByOwner_IdOrderByUploadedAtDesc(owner.getId())
                .stream()
                .map(DocumentResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Document getOwnedDocument(UUID documentId, User owner) {
        return documentRepository.findByIdAndOwner_Id(documentId, owner.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    @Transactional(readOnly = true)
    public DocumentDetailResponse getDetails(UUID documentId, User owner) {
        Document document = getOwnedDocument(documentId, owner);
        DocumentContent content = documentContentRepository.findByDocument_Id(documentId).orElse(null);
        return DocumentDetailResponse.from(document, content);
    }

    @Transactional(readOnly = true)
    public DocumentStatusResponse getStatus(UUID documentId, User owner) {
        Document document = getOwnedDocument(documentId, owner);
        Job job = jobRepository.findByDocument_Id(documentId).orElse(null);
        return DocumentStatusResponse.from(document, job);
    }

    @Transactional
    public void deleteDocument(UUID documentId, User owner) {
        Document document = getOwnedDocument(documentId, owner);
        Path storedPath = Path.of(document.getFilePath());
        try {
            Files.deleteIfExists(storedPath);
        } catch (IOException ex) {
            throw new IllegalStateException("Failed to delete stored file", ex);
        }
        documentRepository.delete(document);
    }

    @Transactional(readOnly = true)
    public Document getDocumentForInternalWorker(UUID documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }
}
