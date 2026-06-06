package com.jonnathas.backend.auth.dto;

import java.time.Instant;

public record AuthResponse(
        String token,
        String tokenType,
        Instant expiresAt,
        UserResponse user
) {
}
