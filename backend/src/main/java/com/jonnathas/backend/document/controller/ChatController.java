package com.jonnathas.backend.document.controller;

import com.jonnathas.backend.document.dto.ChatRequest;
import com.jonnathas.backend.document.dto.ChatResponse;
import com.jonnathas.backend.document.service.RagService;
import com.jonnathas.backend.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.util.UUID;

@RestController
@RequestMapping("api/v1/documents/{documentId}/chat")
public class ChatController {

    private final RagService ragService;

    public ChatController(RagService ragService) {
        this.ragService = ragService;
    }

    @PostMapping
    public ResponseEntity<ChatResponse> ask(
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal User user
    ) {
        ChatResponse response = ragService.askDocument(documentId, request, user);
        return ResponseEntity.ok(response);
    }

    @PostMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamAsk(
            @PathVariable("documentId") UUID documentId,
            @Valid @RequestBody ChatRequest request,
            @AuthenticationPrincipal User user
    ) {
        return ragService.streamAskDocument(documentId, request, user);
    }
}
