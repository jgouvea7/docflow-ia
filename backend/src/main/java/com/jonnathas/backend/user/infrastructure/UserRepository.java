package com.jonnathas.backend.user.infrastructure;

import com.jonnathas.backend.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByEmailIgnoreCaseOrDisplayNameIgnoreCase(String email, String displayName);

    boolean existsByEmailIgnoreCase(String email);

    boolean existsByDisplayNameIgnoreCase(String displayName);
}
