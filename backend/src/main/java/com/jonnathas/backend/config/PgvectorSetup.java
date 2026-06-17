package com.jonnathas.backend.config;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

@Component
public class PgvectorSetup {

    private static final Logger log = LoggerFactory.getLogger(PgvectorSetup.class);

    private final JdbcTemplate jdbcTemplate;

    public PgvectorSetup(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @PostConstruct
    public void init() {
        try {
            jdbcTemplate.execute("CREATE EXTENSION IF NOT EXISTS vector");
            log.info("pgvector extension enabled");
        } catch (Exception e) {
            log.warn("Could not enable pgvector extension: {}. " +
                    "Make sure the extension is installed in PostgreSQL.", e.getMessage());
        }
    }
}
