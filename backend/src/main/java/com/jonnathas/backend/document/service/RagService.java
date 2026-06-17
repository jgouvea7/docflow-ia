package com.jonnathas.backend.document.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jonnathas.backend.document.dto.ChatMessageDto;
import com.jonnathas.backend.document.dto.ChatRequest;
import com.jonnathas.backend.document.dto.ChatResponse;
import com.jonnathas.backend.document.dto.ChatSource;
import com.jonnathas.backend.document.entity.ChatMessageEntity;
import com.jonnathas.backend.document.entity.Document;
import com.jonnathas.backend.document.entity.DocumentEmbedding;
import com.jonnathas.backend.document.infrastructure.ChatMessageRepository;
import com.jonnathas.backend.document.infrastructure.DocumentEmbeddingRepository;
import com.jonnathas.backend.document.infrastructure.DocumentRepository;
import com.jonnathas.backend.user.entity.User;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URI;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Semaphore;
import java.util.stream.Collectors;

@Service
public class RagService {

    private final DocumentRepository documentRepository;
    private final DocumentEmbeddingRepository embeddingRepository;
    private final ChatMessageRepository chatMessageRepository;
    private final ObjectMapper objectMapper;
    private final String aiServiceUrl;
    private final ExecutorService executor;
    private final java.net.http.HttpClient httpClient;
    private final Semaphore aiConcurrencyLimit;

    public RagService(
            DocumentRepository documentRepository,
            DocumentEmbeddingRepository embeddingRepository,
            ChatMessageRepository chatMessageRepository,
            ObjectMapper objectMapper,
            @Value("${app.ai.service-url}") String aiServiceUrl
    ) {
        this.documentRepository = documentRepository;
        this.embeddingRepository = embeddingRepository;
        this.chatMessageRepository = chatMessageRepository;
        this.objectMapper = objectMapper;
        this.aiServiceUrl = aiServiceUrl;
        this.executor = Executors.newVirtualThreadPerTaskExecutor();
        this.httpClient = java.net.http.HttpClient.newHttpClient();
        this.aiConcurrencyLimit = new Semaphore(5);
    }

    public ChatResponse askDocument(UUID documentId, ChatRequest request, User user) {
        Document document = documentRepository.findByIdAndOwner_Id(documentId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        List<DocumentEmbedding> embeddings = embeddingRepository.findByDocument_IdOrderByChunkIndex(documentId);
        if (embeddings.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Este documento ainda não possui embeddings. Aguarde o processamento.");
        }

        double[] queryEmbedding = generateEmbedding(request.question());

        List<ScoredChunk> scoredChunks = findRelevantChunks(queryEmbedding, embeddings, 5);

        if (scoredChunks.isEmpty()) {
            return new ChatResponse("Não encontrei essa informação no documento.", List.of());
        }

        String context = buildContext(scoredChunks);
        String answer = generateAnswer(context, request.question());

        List<ChatSource> sources = scoredChunks.stream()
                .map(sc -> new ChatSource(sc.chunkIndex(), sc.chunkContent(), sc.similarity()))
                .toList();

        return new ChatResponse(answer, sources);
    }

    public SseEmitter streamAskDocument(UUID documentId, ChatRequest request, User user) {
        Document document = documentRepository.findByIdAndOwner_Id(documentId, user.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Document not found"));

        SseEmitter emitter = new SseEmitter(300_000L);

        executor.execute(() -> {
            try {
                String queryEmbeddingJson = generateEmbeddingRaw(request.question());

                List<Object[]> similarChunks = embeddingRepository.findSimilarChunksNative(
                        documentId, queryEmbeddingJson, 5);

                if (similarChunks.isEmpty()) {
                    Map<String, String> fallback = new HashMap<>();
                    fallback.put("answer", "Não encontrei essa informação no documento.");
                    emitter.send(SseEmitter.event().data(objectMapper.writeValueAsString(fallback)));
                    emitter.complete();
                    return;
                }

                List<ScoredChunk> scoredChunks = new ArrayList<>();
                for (Object[] row : similarChunks) {
                    Integer chunkIndex = ((Number) row[0]).intValue();
                    String chunkContent = (String) row[1];
                    Double similarity = row[2] != null ? ((Number) row[2]).doubleValue() : 0.0;
                    scoredChunks.add(new ScoredChunk(chunkIndex, chunkContent, similarity));
                }

                String context = buildContext(scoredChunks);

                List<ChatSource> sources = scoredChunks.stream()
                        .map(sc -> new ChatSource(sc.chunkIndex(), sc.chunkContent(), sc.similarity()))
                        .toList();

                ChatMessageEntity userMsg = new ChatMessageEntity();
                userMsg.setDocument(document);
                userMsg.setRole("user");
                userMsg.setContent(request.question());
                chatMessageRepository.save(userMsg);

                StringBuilder fullAnswer = new StringBuilder();

                String historyText = buildHistoryText(request.history());

                callAiStream(
                        context,
                        request.question(),
                        historyText,
                        new TokenCallback() {
                            @Override
                            public void onToken(String token) {
                                try {
                                    fullAnswer.append(token);
                                    Map<String, String> payload = new HashMap<>();
                                    payload.put("token", token);
                                    emitter.send(SseEmitter.event()
                                            .data(objectMapper.writeValueAsString(payload)));
                                } catch (Exception e) {
                                    // emitter may have completed
                                }
                            }

                            @Override
                            public void onComplete() {
                                try {
                                    Map<String, List<ChatSource>> payload = new HashMap<>();
                                    payload.put("sources", sources);
                                    emitter.send(SseEmitter.event()
                                            .data(objectMapper.writeValueAsString(payload)));
                                    emitter.send(SseEmitter.event()
                                            .data("[DONE]"));
                                } catch (Exception e) {
                                    // ignore
                                }
                            }

                            @Override
                            public void onError(String error) {
                                try {
                                    Map<String, String> payload = new HashMap<>();
                                    payload.put("error", error);
                                    emitter.send(SseEmitter.event()
                                            .data(objectMapper.writeValueAsString(payload)));
                                } catch (Exception e) {
                                    // ignore
                                }
                            }
                        }
                );

                ChatMessageEntity aiMsg = new ChatMessageEntity();
                aiMsg.setDocument(document);
                aiMsg.setRole("assistant");
                aiMsg.setContent(fullAnswer.toString());
                chatMessageRepository.save(aiMsg);

                emitter.complete();

            } catch (Exception e) {
                try {
                    Map<String, String> errorPayload = new HashMap<>();
                    errorPayload.put("error", e.getMessage() != null ? e.getMessage() : "Erro interno");
                    emitter.send(SseEmitter.event()
                            .data(objectMapper.writeValueAsString(errorPayload)));
                } catch (Exception ex) {
                    // ignore
                }
                emitter.completeWithError(e);
            }
        });

        return emitter;
    }

    private String generateEmbeddingRaw(String text) {
        try {
            aiConcurrencyLimit.acquire();
            Map<String, String> body = Map.of("text", text);
            String jsonBody = objectMapper.writeValueAsString(body);

            var request = java.net.http.HttpRequest.newBuilder()
                    .uri(URI.create(aiServiceUrl + "/api/v1/ai/embed"))
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            var response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            return response.body();
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while generating embedding", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate embedding", e);
        } finally {
            aiConcurrencyLimit.release();
        }
    }

    private double[] generateEmbedding(String text) {
        try {
            String raw = generateEmbeddingRaw(text);
            List<Number> list = objectMapper.readValue(raw, new TypeReference<>() {});
            return list.stream().mapToDouble(Number::doubleValue).toArray();
        } catch (Exception e) {
            throw new RuntimeException("Failed to parse embedding", e);
        }
    }

    private List<ScoredChunk> findRelevantChunks(double[] queryEmbedding, List<DocumentEmbedding> embeddings, int topK) {
        List<ScoredChunk> scored = new ArrayList<>();

        for (DocumentEmbedding emb : embeddings) {
            float[] embData = emb.getEmbedding();
            if (embData == null) continue;
            double[] chunkEmbedding = new double[embData.length];
            for (int i = 0; i < embData.length; i++) {
                chunkEmbedding[i] = embData[i];
            }
            double similarity = cosineSimilarity(queryEmbedding, chunkEmbedding);
            scored.add(new ScoredChunk(emb.getChunkIndex(), emb.getChunkContent(), similarity));
        }

        scored.sort((a, b) -> Double.compare(b.similarity(), a.similarity()));

        return scored.subList(0, Math.min(topK, scored.size()));
    }

    private String buildContext(List<ScoredChunk> chunks) {
        return String.join("\n\n", chunks.stream().map(ScoredChunk::chunkContent).toList());
    }

    private String buildHistoryText(List<ChatMessageDto> history) {
        if (history == null || history.isEmpty()) {
            return "";
        }
        return history.stream()
                .map(h -> (h.role().equals("user") ? "Usuário" : "Assistente") + ": " + h.content())
                .collect(Collectors.joining("\n"));
    }

    private String generateAnswer(String context, String question) {
        try {
            aiConcurrencyLimit.acquire();
            Map<String, String> body = new HashMap<>();
            body.put("context", context);
            body.put("question", question);

            String jsonBody = objectMapper.writeValueAsString(body);
            var request = java.net.http.HttpRequest.newBuilder()
                    .uri(URI.create(aiServiceUrl + "/api/v1/ai/generate"))
                    .header("Content-Type", "application/json")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(jsonBody))
                    .build();

            var response = httpClient.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                throw new RuntimeException("AI service returned " + response.statusCode());
            }

            @SuppressWarnings("unchecked")
            Map<String, Object> result = objectMapper.readValue(response.body(), Map.class);
            return (String) result.getOrDefault("answer", "");
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            throw new RuntimeException("Interrupted while generating answer", e);
        } catch (Exception e) {
            throw new RuntimeException("Failed to generate answer", e);
        } finally {
            aiConcurrencyLimit.release();
        }
    }

    private void callAiStream(
            String context,
            String question,
            String history,
            TokenCallback callback
    ) throws Exception {
        Map<String, Object> body = new HashMap<>();
        body.put("context", context);
        body.put("question", question);
        body.put("history", history);

        String jsonBody = objectMapper.writeValueAsString(body);

        URL url = URI.create(aiServiceUrl + "/api/v1/ai/generate/stream").toURL();
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("POST");
        conn.setRequestProperty("Content-Type", "application/json");
        conn.setDoOutput(true);
        conn.setConnectTimeout(30000);
        conn.setReadTimeout(300000);

        try {
            try (OutputStream os = conn.getOutputStream()) {
                os.write(jsonBody.getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int status = conn.getResponseCode();
            if (status != 200) {
                String errorBody;
                try (var errorStream = conn.getErrorStream()) {
                    if (errorStream != null) {
                        errorBody = new String(errorStream.readAllBytes(), StandardCharsets.UTF_8);
                    } else {
                        errorBody = "HTTP " + status;
                    }
                }
                throw new RuntimeException("AI service returned " + status + ": " + errorBody);
            }

            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8))) {

                String line;
                while ((line = reader.readLine()) != null) {
                    String trimmed = line.trim();
                    if (trimmed.startsWith("data: ")) {
                        String data = trimmed.substring(6).trim();
                        if ("[DONE]".equals(data)) {
                            callback.onComplete();
                            break;
                        }
                        try {
                            @SuppressWarnings("unchecked")
                            Map<String, Object> parsed = objectMapper.readValue(data, Map.class);
                            if (parsed.containsKey("token")) {
                                String token = (String) parsed.get("token");
                                callback.onToken(token);
                            } else if (parsed.containsKey("error")) {
                                callback.onError((String) parsed.get("error"));
                            }
                        } catch (Exception e) {
                            // skip unparseable event
                        }
                    }
                }
            }
        } finally {
            conn.disconnect();
        }
    }

    private double cosineSimilarity(double[] a, double[] b) {
        double dotProduct = 0;
        double normA = 0;
        double normB = 0;
        for (int i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        double denom = Math.sqrt(normA) * Math.sqrt(normB);
        if (denom == 0) return 0;
        return dotProduct / denom;
    }

    private record ScoredChunk(Integer chunkIndex, String chunkContent, double similarity) {}

    private interface TokenCallback {
        void onToken(String token);
        void onComplete();
        void onError(String error);
    }
}
