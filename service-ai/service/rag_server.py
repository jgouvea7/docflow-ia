import asyncio
import json
import logging
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from service.rag import embed_text, generate_answer, generate_answer_stream

logger = logging.getLogger(__name__)

app = FastAPI(title="DocFlow AI - RAG Service")


class EmbedRequest(BaseModel):
    text: str = Field(..., max_length=50000)


class GenerateRequest(BaseModel):
    context: str = Field(..., max_length=100000)
    question: str = Field(..., max_length=10000)
    history: str = Field("", max_length=50000)


class GenerateResponse(BaseModel):
    answer: str


@app.post("/api/v1/ai/embed")
async def embed(request: EmbedRequest):
    try:
        embedding = embed_text(request.text)
        return embedding
    except Exception as e:
        logger.exception("embedding_failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/generate")
async def generate(request: GenerateRequest):
    try:
        answer = generate_answer(request.context, request.question)
        return GenerateResponse(answer=answer)
    except Exception as e:
        logger.exception("generation_failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/v1/ai/generate/stream")
async def generate_stream(request: GenerateRequest):
    try:
        async def event_generator():
            queue: asyncio.Queue[str | None] = asyncio.Queue()

            def run_generator():
                try:
                    sync_gen = generate_answer_stream(
                        request.context,
                        request.question,
                        request.history,
                    )
                    for token in sync_gen:
                        queue.put_nowait(token)
                except Exception as e:
                    logger.exception("generator_thread_failed")
                finally:
                    queue.put_nowait(None)

            task = asyncio.create_task(
                asyncio.to_thread(run_generator)
            )

            while True:
                token = await queue.get()
                if token is None:
                    break
                yield f"data: {json.dumps({'token': token})}\n\n"
                await asyncio.sleep(0)

            await task
            yield f"data: [DONE]\n\n"

        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no",
            },
        )
    except Exception as e:
        logger.exception("generation_stream_failed")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/health")
async def health():
    return {"status": "ok"}
