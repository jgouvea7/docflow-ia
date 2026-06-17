package com.jonnathas.backend.document.dto;

import java.util.List;

public record ChatResponse(
        String answer,
        List<ChatSource> sources
) {
}
