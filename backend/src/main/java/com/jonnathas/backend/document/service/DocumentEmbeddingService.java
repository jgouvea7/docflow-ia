package com.jonnathas.backend.document.service;

import com.jonnathas.backend.document.dto.EmbeddingChunkRequest;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentEmbedding;
import com.jonnathas.backend.document.infrastructure.DocumentEmbeddingRepository;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.UUID;

@Service
public class DocumentEmbeddingService {

    private final DocumentRepository documentRepository;
    private final DocumentEmbeddingRepository embeddingRepository;

    public DocumentEmbeddingService(
            DocumentRepository documentRepository,
            DocumentEmbeddingRepository embeddingRepository
    ) {
        this.documentRepository = documentRepository;
        this.embeddingRepository = embeddingRepository;
    }

    @Transactional
    public int saveEmbeddings(UUID documentId, List<EmbeddingChunkRequest> chunks) {
        Document document = documentRepository.findById(documentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        embeddingRepository.deleteByDocument_Id(documentId);

        List<DocumentEmbedding> entities = chunks.stream().map(chunk -> {
            DocumentEmbedding emb = new DocumentEmbedding();
            emb.setDocument(document);
            emb.setChunkIndex(chunk.chunkIndex());
            emb.setChunkContent(chunk.chunkContent());
            emb.setEmbedding(toFloatArray(chunk.embedding()));
            return emb;
        }).toList();

        embeddingRepository.saveAll(entities);
        return entities.size();
    }

    private static float[] toFloatArray(List<Double> list) {
        float[] arr = new float[list.size()];
        for (int i = 0; i < list.size(); i++) {
            arr[i] = list.get(i).floatValue();
        }
        return arr;
    }

    @Transactional(readOnly = true)
    public List<DocumentEmbedding> getEmbeddings(UUID documentId) {
        return embeddingRepository.findByDocument_IdOrderByChunkIndex(documentId);
    }

    @Transactional(readOnly = true)
    public boolean hasEmbeddings(UUID documentId) {
        return embeddingRepository.existsByDocument_Id(documentId);
    }

    @Transactional
    public void deleteEmbeddings(UUID documentId) {
        embeddingRepository.deleteByDocument_Id(documentId);
    }
}
