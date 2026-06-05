package com.jonnathas.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
public class Document {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column
    private String fileName;
    @Column
    private String filePath;

    @Column
    private Status status;

    @Column
    private Instant createdAt;
}
