import os
from typing import Optional

import requests


class BackendClient:
    def __init__(self, base_url: Optional[str] = None, timeout_seconds: int = 15) -> None:
        self.base_url = (base_url or os.getenv("BACKEND_BASE_URL", "http://localhost:8080")).rstrip("/")
        self.timeout_seconds = timeout_seconds
        self.session = requests.Session()
        self.internal_token = os.getenv("BACKEND_INTERNAL_TOKEN")

    def update_job_status(
        self,
        job_id: str,
        status: str,
        progress_percentage: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> dict:
        url = f"{self.base_url}/api/v1/jobs/{job_id}/status"
        payload = {"status": status}
        if progress_percentage is not None:
            payload["progressPercentage"] = progress_percentage
        if error_message is not None:
            payload["errorMessage"] = error_message

        headers = {}
        if self.internal_token:
            headers["X-Internal-Token"] = self.internal_token

        response = self.session.patch(
            url,
            json=payload,
            headers=headers or None,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()

    def save_document_content(self, document_id: str, content: str) -> dict:
        url = f"{self.base_url}/api/v1/documents/{document_id}/content"
        headers = {}
        if self.internal_token:
            headers["X-Internal-Token"] = self.internal_token

        response = self.session.post(
            url,
            json={"content": content},
            headers=headers or None,
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        return response.json()
