package com.jonnathas.backend.document.infrastructure;

import com.jonnathas.backend.document.entity.DocumentEmbedding;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface DocumentEmbeddingRepository extends JpaRepository<DocumentEmbedding, UUID> {
    List<DocumentEmbedding> findByDocument_IdOrderByChunkIndex(UUID documentId);

    boolean existsByDocument_Id(UUID documentId);

    void deleteByDocument_Id(UUID documentId);

    @Query(value = """
            SELECT de.chunk_index, de.chunk_content,
                   1 - (de.embedding <=> CAST(:queryEmbedding AS vector)) AS similarity
            FROM document_embeddings de
            WHERE de.document_id = CAST(:documentId AS uuid)
              AND de.embedding IS NOT NULL
            ORDER BY de.embedding <=> CAST(:queryEmbedding AS vector)
            LIMIT :topK
            """, nativeQuery = true)
    List<Object[]> findSimilarChunksNative(
            @Param("documentId") UUID documentId,
            @Param("queryEmbedding") String queryEmbedding,
            @Param("topK") int topK
    );
}
