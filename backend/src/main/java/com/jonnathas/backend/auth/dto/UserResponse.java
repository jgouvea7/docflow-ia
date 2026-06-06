package com.jonnathas.backend.auth.dto;

import com.jonnathas.backend.user.entity.User;

import java.util.UUID;

public record UserResponse(
        UUID id,
        String email,
        String username,
        String role
) {
    public static UserResponse from(User user) {
        return new UserResponse(
                user.getId(),
                user.getEmail(),
                user.getDisplayName(),
                user.getRole().name()
        );
    }
}
