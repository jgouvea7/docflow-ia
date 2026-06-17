package com.jonnathas.backend.document.infrastructure;

import com.jonnathas.backend.document.entity.ChatMessageEntity;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface ChatMessageRepository extends JpaRepository<ChatMessageEntity, UUID> {
    void deleteByDocument_Id(UUID documentId);
}
