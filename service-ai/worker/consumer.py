import json
import logging
import os
import time
from pathlib import Path
from typing import Any, Dict

import pika
from service.extraction_service import ExtractionService

_logger = logging.getLogger(__name__)

def _get_rabbitmq_connection() -> pika.BlockingConnection:
    host = os.getenv("RABBITMQ_HOST", "localhost")
    port = int(os.getenv("RABBITMQ_PORT", "5672"))
    username = os.getenv("RABBITMQ_USER")
    password = os.getenv("RABBITMQ_PASS")

    if username and password:
        credentials = pika.PlainCredentials(username, password)
        params = pika.ConnectionParameters(host=host, port=port, credentials=credentials)
    else:
        params = pika.ConnectionParameters(host=host, port=port)

    return pika.BlockingConnection(params)


def _parse_message(body: bytes) -> Dict[str, Any]:
    message = json.loads(body)

    for key in ["jobId", "documentId"]:
        if key not in message:
            raise ValueError(f"Missing field: {key}")
        if not isinstance(message[key], str):
            raise ValueError(f"Field {key} must be a string")

    return message


def _resolve_document_path(document_id: str) -> Path:
    base_path = Path(os.getenv("STORAGE_UPLOADS_PATH", "storage/uploads"))
    matches = list(base_path.glob(f"{document_id}_*"))

    if not matches:
        raise FileNotFoundError(f"Document file not found for id {document_id}")

    if len(matches) > 1:
        _logger.warning("multiple_files_found documentId=%s count=%d", document_id, len(matches))

    return matches[0]


def _handle_message(service: ExtractionService, message: Dict[str, Any]) -> None:
    job_id = message["jobId"]
    document_id = message["documentId"]

    _logger.info("processing_job jobId=%s documentId=%s", job_id, document_id)

    document_path = _resolve_document_path(document_id)

    _logger.info("document_path jobId=%s path=%s", job_id, document_path)

    service.process(
        job_id,
        document_id,
        str(document_path)
    )

    _logger.info(
        "extraction_done documentId=%s jobId=%s path=%s",
        document_id,
        job_id,
        document_path,
    )


def _consume(queue_name: str) -> None:
    connection = _get_rabbitmq_connection()
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)

    service = ExtractionService()

    def callback(ch, method, properties, body) -> None:
        try:
            message = _parse_message(body)
            _handle_message(service, message)
            ch.basic_ack(delivery_tag=method.delivery_tag)

        except Exception:
            _logger.exception("extraction_failed delivery_tag=%s", method.delivery_tag)
            ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()


def start() -> None:
    queue_name = os.getenv("RABBITMQ_QUEUE", "job_queue")
    retry_delay = 5

    while True:
        try:
            _logger.info("connecting_to_rabbitmq queue=%s", queue_name)
            _consume(queue_name)
        except Exception:
            _logger.exception("rabbitmq_connection_lost reconnecting_in_%ds", retry_delay)
            time.sleep(retry_delay)
