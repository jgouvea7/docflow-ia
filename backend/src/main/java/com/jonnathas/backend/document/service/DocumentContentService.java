package com.jonnathas.backend.document.service;

import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentContent;
import com.jonnathas.backend.document.infrastructure.DocumentContentRepository;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.UUID;

@Service
public class DocumentContentService {

    private final DocumentRepository documentRepository;
    private final DocumentContentRepository documentContentRepository;

    public DocumentContentService(
            DocumentRepository documentRepository,
            DocumentContentRepository documentContentRepository
    ) {
        this.documentRepository = documentRepository;
        this.documentContentRepository = documentContentRepository;
    }

    @Transactional
    public DocumentContent saveContent(UUID documentId, String content) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        DocumentContent documentContent = documentContentRepository
                .findByDocument_Id(documentId)
                .orElseGet(DocumentContent::new);

        documentContent.setDocument(document);
        documentContent.setContent(content);

        return documentContentRepository.save(documentContent);
    }
}
