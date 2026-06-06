package com.jonnathas.backend.web;

public record ApiErrorResponse(
        int status,
        String message,
        String details
) {
}
