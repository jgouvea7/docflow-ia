from api_client.backend_client import BackendClient
from document_reader.reader import DocumentReader


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