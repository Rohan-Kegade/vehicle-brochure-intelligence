import uuid

from app.services.generation import _message_text, generate_title
from app.services.retrieval import RetrievedChunk


class _Reply:
    def __init__(self, content: object) -> None:
        self.content = content


class _FakeLLM:
    def __init__(self, content: object) -> None:
        self._content = content
        self.messages: list | None = None

    async def ainvoke(self, messages: list) -> _Reply:
        self.messages = messages
        return _Reply(self._content)


def _chunk(title: str) -> RetrievedChunk:
    return RetrievedChunk(
        chunk_id=uuid.uuid4(),
        document_id=uuid.uuid4(),
        document_title=title,
        page_start=1,
        page_end=1,
        kind="text",
        content="...",
        score=1.0,
    )


def test_message_text_plain_string() -> None:
    assert _message_text(_Reply("Identify This Car")) == "Identify This Car"


def test_message_text_gemini_thinking_blocks() -> None:
    # Gemini 3.x with thinking on: content is a list of typed blocks.
    content = [
        {"type": "thinking", "thinking": "the user wants a title"},
        {"type": "text", "text": "Identify This Car", "extras": {"signature": "Eo0H"}},
    ]
    assert _message_text(_Reply(content)) == "Identify This Car"


def test_message_text_unknown_shape_is_empty() -> None:
    assert _message_text(_Reply(42)) == ""


async def test_generate_title_strips_and_normalises() -> None:
    llm = _FakeLLM([{"type": "text", "text": '  "Aurora GT Towing"\n'}])
    assert await generate_title("How much can it tow?", llm=llm) == "Aurora GT Towing"


async def test_generate_title_returns_empty_on_failure() -> None:
    class _Boom:
        async def ainvoke(self, _messages: object) -> object:
            raise RuntimeError("no api key")

    assert await generate_title("anything", llm=_Boom()) == ""


async def test_generate_title_feeds_vehicle_names_from_chunks() -> None:
    llm = _FakeLLM([{"type": "text", "text": "Aurora GT Towing Capacity"}])

    title = await generate_title(
        "how much can it tow?",
        [_chunk("Aurora_GT.pdf"), _chunk("Aurora_GT.pdf")],
        llm=llm,
    )

    assert title == "Aurora GT Towing Capacity"
    human = llm.messages[-1].content
    assert "Aurora GT" in human  # deduped, ".pdf"/"_" cleaned


async def test_generate_title_without_chunks_is_question_only() -> None:
    llm = _FakeLLM("Some Title")
    await generate_title("what engine does it have?", llm=llm)
    assert "Brochure(s) in context" not in llm.messages[-1].content
