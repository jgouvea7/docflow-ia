package com.jonnathas.backend.document.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record EmbeddingChunkRequest(
        @NotNull Integer chunkIndex,
        @NotBlank String chunkContent,
        @NotNull List<Double> embedding
) {
}
