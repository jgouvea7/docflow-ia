import os
from typing import Any, Dict, List, Optional

import requests
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry


class BackendClient:
    def __init__(self, base_url: Optional[str] = None, timeout_seconds: int = 30) -> None:
        self.base_url = (base_url or os.getenv("BACKEND_BASE_URL", "http://localhost:8080")).rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()

        retries = Retry(
            total=3,
            backoff_factor=0.5,
            status_forcelist=[500, 502, 503, 504],
            allowed_methods=["PATCH", "POST"],
        )
        adapter = HTTPAdapter(max_retries=retries)
        self.session.mount("http://", adapter)
        self.session.mount("https://", adapter)

        self.internal_token = os.getenv("BACKEND_INTERNAL_TOKEN")

    def close(self) -> None:
        self.session.close()

    def _headers(self) -> Optional[Dict[str, str]]:
        if self.internal_token:
            return {"X-Internal-Token": self.internal_token}
        return None

    def update_job_status(
        self,
        job_id: str,
        status: str,
        progress_percentage: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> dict:
        url = f"{self.base_url}/api/v1/jobs/{job_id}/status"
        payload: Dict[str, Any] = {"status": status}
        if progress_percentage is not None:
            payload["progressPercentage"] = progress_percentage
        if error_message is not None:
            payload["errorMessage"] = error_message

        response = self.session.patch(
            url,
            json=payload,
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()

    def save_document_content(self, document_id: str, content: str) -> dict:
        url = f"{self.base_url}/api/v1/documents/{document_id}/content"

        response = self.session.post(
            url,
            json={"content": content},
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()

    def save_embeddings(self, document_id: str, chunks: List[Dict[str, Any]]) -> dict:
        url = f"{self.base_url}/api/v1/documents/{document_id}/embeddings"

        response = self.session.post(
            url,
            json=chunks,
            headers=self._headers(),
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()
