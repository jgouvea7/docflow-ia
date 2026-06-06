package com.jonnathas.backend.document.controller;

import com.jonnathas.backend.document.dto.DocumentContentRequest;
import com.jonnathas.backend.document.dto.DocumentContentResponse;
import com.jonnathas.backend.document.dto.DocumentDetailResponse;
import com.jonnathas.backend.document.dto.DocumentResponse;
import com.jonnathas.backend.document.dto.DocumentStatusResponse;
import com.jonnathas.backend.document.dto.UploadResponse;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentContent;
import com.jonnathas.backend.document.service.DocumentContentService;
import com.jonnathas.backend.document.service.DocumentService;
import com.jonnathas.backend.job.entity.Job;
import com.jonnathas.backend.job.service.JobService;
import com.jonnathas.backend.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("api/v1/documents")
public class DocumentController {

    private final DocumentService documentService;
    private final DocumentContentService documentContentService;
    private final JobService jobService;

    public DocumentController(
            DocumentService documentService,
            DocumentContentService documentContentService,
            JobService jobService
    ) {
        this.documentService = documentService;
        this.documentContentService = documentContentService;
        this.jobService = jobService;
    }

    @GetMapping
    public ResponseEntity<List<DocumentResponse>> listDocuments(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(documentService.findAllForUser(user));
    }

    @PostMapping("/upload")
    public ResponseEntity<UploadResponse> uploadDocument(
            @AuthenticationPrincipal User user,
            @RequestParam("file") MultipartFile file
    ) {
        if (file.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "File is empty");
        }

        Document document = documentService.createDocument(user, file);
        Job job = jobService.createAndPublish(document);

        UploadResponse response = new UploadResponse(
                document.getId(),
                job.getId(),
                job.getStatus().name()
        );

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<DocumentDetailResponse> getDocument(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.getDetails(id, user));
    }

    @GetMapping("/{id}/status")
    public ResponseEntity<DocumentStatusResponse> getStatus(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal User user
    ) {
        return ResponseEntity.ok(documentService.getStatus(id, user));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(
            @PathVariable("id") UUID id,
            @AuthenticationPrincipal User user
    ) {
        documentService.deleteDocument(id, user);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{documentId}/content")
    public ResponseEntity<DocumentContentResponse> saveDocumentContent(
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody DocumentContentRequest request
    ) {
        DocumentContent savedContent = documentContentService.saveContent(documentId, request.content());
        return ResponseEntity.ok(DocumentContentResponse.from(savedContent));
    }
}
