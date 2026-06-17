import logging

from api_client.backend_client import BackendClient
from document_reader.reader import DocumentReader

logger = logging.getLogger(__name__)


class ExtractionService:

    def __init__(self):
        self.client = BackendClient()

    def process(
        self,
        job_id: str,
        document_id: str,
        document_path: str
    ) -> None:

        try:

            self.client.update_job_status(
                job_id,
                "PROCESSING",
                progress_percentage=15
            )

            # Extrai o texto do documento normalmente
            text = DocumentReader.extract_text(
                document_path
            )

            # CORREÇÃO: Limpa o caractere nulo (0x00) se ele existir no texto extraído
            if text:
                text = text.replace('\x00', '')

            self.client.save_document_content(
                document_id,
                text
            )

            self.client.update_job_status(
                job_id,
                "PROCESSING",
                progress_percentage=60
            )

            # Pipeline RAG: chunking + embeddings
            try:
                from service.rag import create_document_index
                index = create_document_index(text)
                chunks = index["chunks"]
                embeddings = index["embeddings"]

                embedding_chunks = []
                for i, (chunk, emb) in enumerate(zip(chunks, embeddings)):
                    embedding_chunks.append({
                        "chunkIndex": i,
                        "chunkContent": chunk,
                        "embedding": emb.tolist()
                    })

                self.client.save_embeddings(document_id, embedding_chunks)
                logger.info("embeddings_saved documentId=%s chunks=%d", document_id, len(embedding_chunks))

            except Exception as rag_exc:
                logger.warning("embedding_generation_failed documentId=%s error=%s", document_id, rag_exc)
                self.client.update_job_status(
                    job_id,
                    "COMPLETED",
                    progress_percentage=100,
                    error_message=f"Texto extraído, mas embeddings não gerados: {rag_exc}"
                )
                return

            self.client.update_job_status(
                job_id,
                "COMPLETED",
                progress_percentage=100
            )

        except Exception as exc:

            self.client.update_job_status(
                job_id,
                "FAILED",
                progress_percentage=100,
                error_message=str(exc)
            )

            raise
