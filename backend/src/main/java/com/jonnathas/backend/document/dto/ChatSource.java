package com.jonnathas.backend.document.dto;

public record ChatSource(
        Integer chunkIndex,
        String chunkContent,
        Double similarity
) {
}
