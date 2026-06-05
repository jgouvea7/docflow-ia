package com.jonnathas.backend.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.Instant;
import java.util.UUID;

@Entity
@Getter
@Setter
public class Job {
    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    private Long id;

    @Column
    private UUID documentId;

    @Column
    private Status status;

    @Column
    private int attempts;

    @Column
    private Instant startedAt;

    @Column
    private Instant finishedAt;
}
