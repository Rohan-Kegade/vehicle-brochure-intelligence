import uuid
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio

from app.db import async_session_maker
from app.models import Conversation
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


@pytest_asyncio.fixture
async def conversation(test_user) -> AsyncIterator[Conversation]:
    """A persisted, owned conversation. Cascades away with `test_user`."""
    async with async_session_maker() as session:
        conv = Conversation(user_id=test_user.id)
        session.add(conv)
        await session.commit()
        await session.refresh(conv)
        session.expunge(conv)
    yield conv


@pytest.fixture
def patch_pipeline(monkeypatch):
    """Stub retrieval + generation so the SSE endpoint runs offline."""

    def _install(
        chunks: list[RetrievedChunk], answer: str, title: str = "Generated Title"
    ) -> None:
        async def _fake_retrieve(*_args, **_kwargs) -> list[RetrievedChunk]:
            return chunks

        async def _fake_stream(*_args, **_kwargs) -> AsyncIterator[str]:
            for word in answer.split(" "):
                yield word + " "

        async def _fake_title(*_args, **_kwargs) -> str:
            return title

        monkeypatch.setattr("app.api.conversations.retrieve", _fake_retrieve)
        monkeypatch.setattr("app.api.conversations.stream_answer", _fake_stream)
        monkeypatch.setattr("app.api.conversations.generate_title", _fake_title)

    return _install


async def test_message_streams_answer_and_citations(
    client, conversation, patch_pipeline
):
    patch_pipeline(
        [_chunk("Aurora_GT.pdf", 12, "Towing capacity is 5,000 lb.")],
        "The towing capacity is 5,000 lb.",
    )

    resp = await client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "What can it tow?", "mode": "Balanced"},
    )

    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/event-stream")
    body = resp.text
    assert "event: token" in body
    assert "5,000" in body
    assert "event: citations" in body
    assert "Aurora GT \\u2014 page 12" in body or "Aurora GT — page 12" in body
    assert "event: done" in body


async def test_message_is_persisted_to_the_conversation(
    client, conversation, patch_pipeline
):
    patch_pipeline([_chunk("Aurora_GT.pdf", 3, "Seats five.")], "It seats five.")

    await client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "How many seats?"},
    )

    detail = await client.get(f"/conversations/{conversation.id}")
    assert detail.status_code == 200
    body = detail.json()
    roles = [m["role"] for m in body["messages"]]
    assert roles == ["user", "assistant"]
    assert body["messages"][0]["content"] == "How many seats?"
    assert "seats five" in body["messages"][1]["content"].lower()
    # first message became the auto-title
    assert body["title"] == "How many seats?"


async def test_message_without_context_is_honest(client, conversation, patch_pipeline):
    patch_pipeline([], "unused")

    resp = await client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "Tell me about a car we never indexed."},
    )

    assert resp.status_code == 200
    body = resp.text
    assert "don't have any indexed brochure content" in body
    assert '"citations": []' in body
    assert "event: done" in body


async def test_start_conversation_creates_row_and_llm_title(client, patch_pipeline):
    patch_pipeline(
        [_chunk("Aurora_GT.pdf", 8, "0-60 in 4.2 s.")],
        "It does 0-60 in 4.2 seconds.",
        title="Aurora GT Acceleration",
    )

    before = await client.get("/conversations")
    assert before.json() == []

    resp = await client.post(
        "/conversations/messages",
        json={"content": "How quick is it?", "mode": "Balanced"},
    )
    assert resp.status_code == 200
    body = resp.text
    assert "event: conversation" in body
    assert "event: token" in body
    assert "event: citations" in body
    assert "event: title" in body
    assert "Aurora GT Acceleration" in body
    assert "event: done" in body

    listing = (await client.get("/conversations")).json()
    assert len(listing) == 1
    assert listing[0]["title"] == "Aurora GT Acceleration"

    detail = (await client.get(f"/conversations/{listing[0]['id']}")).json()
    assert [m["role"] for m in detail["messages"]] == ["user", "assistant"]
    assert detail["messages"][0]["content"] == "How quick is it?"


async def test_start_conversation_without_context_still_persists(client, patch_pipeline):
    patch_pipeline([], "unused", title="Unknown Vehicle Query")

    resp = await client.post(
        "/conversations/messages",
        json={"content": "Tell me about a car we never indexed."},
    )
    assert resp.status_code == 200
    assert "don't have any indexed brochure content" in resp.text

    listing = (await client.get("/conversations")).json()
    assert len(listing) == 1
    assert listing[0]["title"] == "Unknown Vehicle Query"


async def test_message_on_unknown_conversation_is_404(client, patch_pipeline):
    patch_pipeline([_chunk("x.pdf", 1, "y")], "z")
    resp = await client.post(
        f"/conversations/{uuid.uuid4()}/messages",
        json={"content": "hello"},
    )
    assert resp.status_code == 404


async def test_message_rejects_empty_content(client, conversation):
    resp = await client.post(
        f"/conversations/{conversation.id}/messages", json={"content": ""}
    )
    assert resp.status_code == 422


async def test_message_rejects_unknown_mode(client, conversation):
    resp = await client.post(
        f"/conversations/{conversation.id}/messages",
        json={"content": "hi", "mode": "psychic"},
    )
    assert resp.status_code == 422


async def test_conversation_crud_roundtrip(client):
    created = await client.post("/conversations", json={})
    assert created.status_code == 201
    conv_id = created.json()["id"]

    listing = await client.get("/conversations")
    assert conv_id in {c["id"] for c in listing.json()}

    renamed = await client.patch(
        f"/conversations/{conv_id}", json={"title": "Towing questions"}
    )
    assert renamed.status_code == 200
    assert renamed.json()["title"] == "Towing questions"

    deleted = await client.delete(f"/conversations/{conv_id}")
    assert deleted.status_code == 204
    assert (await client.get(f"/conversations/{conv_id}")).status_code == 404
