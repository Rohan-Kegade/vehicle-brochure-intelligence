"""Per-user conversations plus the SSE chat endpoint.

`POST /conversations/{id}/messages` retrieves grounded context (hard-scoped to
the caller), streams the LLM's answer, emits the citation list, and persists
both turns to `messages` so a conversation reloads with its history.

Event stream:
  event: token      data: {"text": "..."}      # repeated, answer deltas
  event: citations  data: {"citations": [...]}  # once, after the answer
  event: done       data: {}
  event: error      data: {"detail": "..."}     # on generation failure
"""

import json
import uuid
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import StreamingResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.db import get_session
from app.models import (
    DEFAULT_CONVERSATION_TITLE,
    Conversation,
    Document,
    Message,
    User,
)
from app.schemas.chat import MessageCreate
from app.schemas.conversation import (
    ConversationCreate,
    ConversationDetail,
    ConversationRead,
    ConversationUpdate,
)
from app.services.generation import collect_citations, stream_answer
from app.services.retrieval import retrieve

router = APIRouter(prefix="/conversations", tags=["conversations"])

_NO_CONTEXT = (
    "I don't have any indexed brochure content that answers that. "
    "Upload a brochure or widen the document selection and ask again."
)


def _sse(event: str, data: dict) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _title_from(question: str) -> str:
    text = " ".join(question.split())
    return text[:60].rstrip() + "…" if len(text) > 60 else text


async def _owned_conversation(
    session: AsyncSession, user: User, conversation_id: uuid.UUID
) -> Conversation:
    conv = await session.scalar(
        select(Conversation).where(
            Conversation.id == conversation_id, Conversation.user_id == user.id
        )
    )
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    return conv


@router.post("", response_model=ConversationRead, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    payload: ConversationCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Conversation:
    conv = Conversation(
        user_id=user.id, title=payload.title or DEFAULT_CONVERSATION_TITLE
    )
    session.add(conv)
    await session.commit()
    await session.refresh(conv)
    return conv


@router.get("", response_model=list[ConversationRead])
async def list_conversations(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Conversation]:
    result = await session.execute(
        select(Conversation)
        .where(Conversation.user_id == user.id)
        .order_by(Conversation.updated_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Conversation:
    conv = await session.scalar(
        select(Conversation)
        .where(Conversation.id == conversation_id, Conversation.user_id == user.id)
        .options(selectinload(Conversation.messages))
    )
    if conv is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conversation not found.")
    return conv


@router.patch("/{conversation_id}", response_model=ConversationRead)
async def rename_conversation(
    conversation_id: uuid.UUID,
    payload: ConversationUpdate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Conversation:
    conv = await _owned_conversation(session, user, conversation_id)
    conv.title = payload.title.strip()
    await session.commit()
    await session.refresh(conv)
    return conv


@router.delete("/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Response:
    conv = await _owned_conversation(session, user, conversation_id)
    await session.delete(conv)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/{conversation_id}/messages")
async def create_message(
    conversation_id: uuid.UUID,
    payload: MessageCreate,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    conv = await _owned_conversation(session, user, conversation_id)

    doc_ids = list(dict.fromkeys(payload.document_ids or []))
    if doc_ids:
        owned = await session.scalar(
            select(func.count())
            .select_from(Document)
            .where(Document.user_id == user.id, Document.id.in_(doc_ids))
        )
        if owned != len(doc_ids):
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST, "Unknown document in selection."
            )

    chunks = await retrieve(
        session,
        query=payload.content,
        user_id=user.id,
        mode=payload.mode,
        document_ids=doc_ids or None,
    )

    async def events() -> AsyncIterator[str]:
        session.add(
            Message(conversation_id=conv.id, role="user", content=payload.content)
        )
        if conv.title == DEFAULT_CONVERSATION_TITLE:
            conv.title = _title_from(payload.content)
        await session.commit()

        if not chunks:
            yield _sse("token", {"text": _NO_CONTEXT})
            yield _sse("citations", {"citations": []})
            session.add(
                Message(
                    conversation_id=conv.id,
                    role="assistant",
                    content=_NO_CONTEXT,
                    citations=[],
                    mode=str(payload.mode),
                )
            )
            await session.commit()
            yield _sse("done", {})
            return

        parts: list[str] = []
        try:
            async for delta in stream_answer(payload.content, chunks):
                parts.append(delta)
                yield _sse("token", {"text": delta})
        except Exception as exc:  # surface generation failures to the client
            yield _sse("error", {"detail": str(exc)})
            return

        citations = collect_citations(chunks)
        session.add(
            Message(
                conversation_id=conv.id,
                role="assistant",
                content="".join(parts),
                citations=citations,
                mode=str(payload.mode),
            )
        )
        await session.commit()
        yield _sse("citations", {"citations": citations})
        yield _sse("done", {})

    return StreamingResponse(
        events(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
