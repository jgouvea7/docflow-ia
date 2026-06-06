package com.jonnathas.backend.document.dto;

import com.jonnathas.backend.document.entity.DocumentContent;

import java.util.UUID;

public record DocumentContentResponse(
        UUID documentId,
        UUID contentId
) {
    public static DocumentContentResponse from(DocumentContent documentContent) {
        return new DocumentContentResponse(
                documentContent.getDocument().getId(),
                documentContent.getId()
        );
    }
}
