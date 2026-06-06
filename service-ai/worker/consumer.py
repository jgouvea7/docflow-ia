import json
import logging
import os
from pathlib import Path
from typing import Any, Dict

import pika
from service.extraction_service import ExtractionService

service = ExtractionService()

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

    return message


def _resolve_document_path(document_id: str) -> Path:
    base_path = Path(os.getenv("STORAGE_UPLOADS_PATH", "storage/uploads"))
    matches = list(base_path.glob(f"{document_id}_*"))

    if not matches:
        raise FileNotFoundError(f"Document file not found for id {document_id}")

    return matches[0]


def _handle_message(message: Dict[str, Any]) -> None:
    print("HANDLE MESSAGE START")
    job_id = message["jobId"]
    document_id = message["documentId"]

    print("JOB:", job_id)
    print("DOCUMENT:", document_id)

    document_path = _resolve_document_path(
        document_id
    )

    print("PATH:", document_path)


    service.process(
        job_id,
        document_id,
        str(document_path)
    )

    print("SERVICE PROCESS FINISHED")

    logging.info(
        "extraction_done documentId=%s jobId=%s path=%s",
        document_id,
        job_id,
        document_path,
    )
    


def start() -> None:
    print("START CALLED")
    queue_name = os.getenv("RABBITMQ_QUEUE", "job_queue")

    connection = _get_rabbitmq_connection()
    channel = connection.channel()
    channel.queue_declare(queue=queue_name, durable=True)
    channel.basic_qos(prefetch_count=1)

    def callback(ch, method, properties, body) -> None:
        print("MESSAGE RECEIVED")
        print(body)
        try:
            message = _parse_message(body)
            _handle_message(message)
            ch.basic_ack(
                delivery_tag=method.delivery_tag
            )

        except Exception:
            logging.exception(
                "extraction_failed"
            )

            ch.basic_ack(delivery_tag=method.delivery_tag)

    channel.basic_consume(queue=queue_name, on_message_callback=callback)
    channel.start_consuming()
