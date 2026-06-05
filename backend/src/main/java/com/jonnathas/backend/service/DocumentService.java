package com.jonnathas.backend.service;

import com.jonnathas.backend.entity.Document;
import com.jonnathas.backend.entity.Status;
import com.jonnathas.backend.infrastructure.DocumentRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Instant;
import java.util.UUID;

@Service
public class DocumentService {

    private final Path filePath = Paths.get("storage", "uploads");

    @Autowired
    private DocumentRepository documentRepository;

    @Autowired
    private JobService jobService;

    public Document createDocument(MultipartFile file) {
        Document document = new Document();

        document.setFileName(file.getOriginalFilename());
        document.setFilePath(filePath.toString());
        document.setStatus(Status.PENDING);
        document.setCreatedAt(Instant.now());

        Document savedDocument = documentRepository.save(document);
        jobService.createAndPublish(savedDocument.getId());

        return savedDocument;
    }
}
