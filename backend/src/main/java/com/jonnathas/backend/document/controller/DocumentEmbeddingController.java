package com.jonnathas.backend.document.controller;

import com.jonnathas.backend.document.dto.EmbeddingChunkRequest;
import com.jonnathas.backend.document.dto.EmbeddingSavedResponse;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentStatus;
import com.jonnathas.backend.document.service.DocumentEmbeddingService;
import com.jonnathas.backend.document.service.DocumentService;
import com.jonnathas.backend.job.dto.JobResponse;
import com.jonnathas.backend.job.service.JobService;
import com.jonnathas.backend.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("api/v1/documents/{documentId}/embeddings")
public class DocumentEmbeddingController {

    private final DocumentEmbeddingService embeddingService;
    private final DocumentService documentService;
    private final JobService jobService;

    public DocumentEmbeddingController(
            DocumentEmbeddingService embeddingService,
            DocumentService documentService,
            JobService jobService
    ) {
        this.embeddingService = embeddingService;
        this.documentService = documentService;
        this.jobService = jobService;
    }

    @PostMapping
    public ResponseEntity<EmbeddingSavedResponse> saveEmbeddings(
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody List<EmbeddingChunkRequest> chunks
    ) {
        int saved = embeddingService.saveEmbeddings(documentId, chunks);
        return ResponseEntity.ok(new EmbeddingSavedResponse(documentId, saved));
    }

    @PostMapping("/re-embed")
    public ResponseEntity<JobResponse> reEmbed(
            @PathVariable("documentId") UUID documentId,
            @AuthenticationPrincipal User user
    ) {
        Document document = documentService.getOwnedDocument(documentId, user);

        embeddingService.deleteEmbeddings(documentId);

        document.setStatus(DocumentStatus.PENDING);
        document.setProgressPercentage(0);
        document.setErrorMessage(null);
        document.setCompletedAt(null);
        documentService.save(document);

        var job = jobService.createAndPublish(document);
        return ResponseEntity.ok(JobResponse.from(job));
    }
}
