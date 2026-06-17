package com.jonnathas.backend.document.service;

import com.jonnathas.backend.document.dto.DocumentDetailResponse;
import com.jonnathas.backend.document.dto.DocumentResponse;
import com.jonnathas.backend.document.dto.DocumentStatusResponse;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentContent;
import com.jonnathas.backend.document.entity.DocumentStatus;
import com.jonnathas.backend.document.infrastructure.ChatMessageRepository;
import com.jonnathas.backend.document.infrastructure.DocumentContentRepository;
import com.jonnathas.backend.document.infrastructure.DocumentEmbeddingRepository;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import com.jonnathas.backend.job.entity.Job;
import com.jonnathas.backend.job.infrastructure.JobRepository;
import com.jonnathas.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Autowired;
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
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class DocumentService {

    private static final Logger log = LoggerFactory.getLogger(DocumentService.class);

    private final Path uploadRoot;
    @Autowired
    private DocumentRepository documentRepository;
    @Autowired
    private DocumentContentRepository documentContentRepository;
    @Autowired
    private JobRepository jobRepository;
    @Autowired
    private DocumentEmbeddingRepository documentEmbeddingRepository;
    @Autowired
    private ChatMessageRepository chatMessageRepository;

    public DocumentService(
            @Value("${app.storage.upload-dir}") String uploadDir
    ) {
        this.uploadRoot = Paths.get(uploadDir);
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
            chatMessageRepository.deleteByDocument_Id(documentId);
            documentRepository.delete(document);
            Files.deleteIfExists(storedPath);
        } catch (Exception ex) {
            log.error("Failed to delete document {}: {}", documentId, ex.getMessage(), ex);
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Não foi possível excluir o documento", ex);
        }
    }

    @Transactional(readOnly = true)
    public Document getDocumentForInternalWorker(UUID documentId) {
        return documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));
    }

    @Transactional
    public Document save(Document document) {
        return documentRepository.save(document);
    }
}
