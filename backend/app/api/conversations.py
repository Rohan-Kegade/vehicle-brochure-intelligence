"""SSE chat endpoint: retrieve grounded context, stream the LLM's answer, then
emit the citation list.

Conversations/messages are not persisted in M1 (that lands in M5) — the
`conversation_id` is accepted but only scopes the request.

Event stream:
  event: token      data: {"text": "..."}      # repeated, answer deltas
  event: citations  data: {"citations": [...]}  # once, after the answer
  event: done       data: {}
  event: error      data: {"detail": "..."}     # on generation failure
"""

import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.schemas.chat import MessageCreate
from app.services.generation import collect_citations, stream_answer
from app.services.retrieval import retrieve

router = APIRouter(prefix="/conversations", tags=["conversations"])

_NO_CONTEXT = (
    "I don't have any indexed brochure content that answers that. "
    "Upload a brochure or widen the document selection and ask again."
)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


@router.post("/{conversation_id}/messages")
async def create_message(
    conversation_id: str,
    payload: MessageCreate,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    chunks = await retrieve(
        session,
        query=payload.content,
        mode=payload.mode,
        document_ids=payload.document_ids,
    )

    async def events() -> AsyncIterator[str]:
        if not chunks:
            yield _sse("token", {"text": _NO_CONTEXT})
            yield _sse("citations", {"citations": []})
            yield _sse("done", {})
            return

        try:
            async for delta in stream_answer(payload.content, chunks):
                yield _sse("token", {"text": delta})
        except Exception as exc:  # surface generation failures to the client
            yield _sse("error", {"detail": str(exc)})
            return

        yield _sse("citations", {"citations": collect_citations(chunks)})
        yield _sse("done", {})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
