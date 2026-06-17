package com.jonnathas.backend.document.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record ChatRequest(
        @NotBlank String question,
        List<ChatMessageDto> history
) {
}
