import uuid
from collections.abc import AsyncIterator

import pytest

from app.services.retrieval import RetrievedChunk


def _chunk(title: str, page: int, content: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        document_title=title,
        page_start=page,
        page_end=page,
        kind="text",
        content=content,
        score=1.0,
    )


@pytest.fixture
def patch_pipeline(monkeypatch):
    """Stub retrieval + generation so the SSE endpoint runs offline."""

    def _install(chunks: list[RetrievedChunk], answer: str) -> None:
        async def _fake_retrieve(*_args, **_kwargs) -> list[RetrievedChunk]:
            return chunks

        async def _fake_stream(*_args, **_kwargs) -> AsyncIterator[str]:
            for word in answer.split(" "):
                yield word + " "

        monkeypatch.setattr("app.api.conversations.retrieve", _fake_retrieve)
        monkeypatch.setattr("app.api.conversations.stream_answer", _fake_stream)

    return _install


async def test_message_streams_answer_and_citations(client, patch_pipeline):
    patch_pipeline(
        [_chunk("Aurora_GT.pdf", 12, "Towing capacity is 5,000 lb.")],
        "The towing capacity is 5,000 lb [1].",
    )

    resp = await client.post(
        "/conversations/c1/messages",
        json={"content": "What can it tow?", "mode": "Balanced"},
    )

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert "event: token" in body
    assert "5,000" in body
    assert 'event: citations' in body
    assert "Aurora GT \\u2014 page 12" in body or "Aurora GT — page 12" in body
    assert body.strip().endswith("event: done\ndata: {}") or "event: done" in body


async def test_message_without_context_is_honest(client, patch_pipeline):
    patch_pipeline([], "unused")

    resp = await client.post(
        "/conversations/c1/messages",
        json={"content": "Tell me about a car we never indexed."},
    )

    assert resp.status_code == 200
    body = resp.text
    assert "don't have any indexed brochure content" in body
    assert '"citations": []' in body
    assert "event: done" in body


async def test_message_rejects_empty_content(client):
    resp = await client.post("/conversations/c1/messages", json={"content": ""})
    assert resp.status_code == 422


async def test_message_rejects_unknown_mode(client):
    resp = await client.post(
        "/conversations/c1/messages",
        json={"content": "hi", "mode": "psychic"},
    )
    assert resp.status_code == 422
