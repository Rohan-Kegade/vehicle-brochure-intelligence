"""Grounded generation: build a labeled-context prompt, stream Claude's answer,
and turn its inline [n] markers into frontend-style citation strings.
"""

import re
from collections.abc import AsyncIterator
from functools import lru_cache

from anthropic import AsyncAnthropic

from app.config import get_settings
from app.services.retrieval import RetrievedChunk

SYSTEM_PROMPT = (
    "You are a vehicle-brochure assistant. Answer the user's question using ONLY "
    "the numbered context passages below. After every factual sentence, add inline "
    "citation markers like [1] or [2][3] naming the passages you used. If the "
    "answer is not in the passages, say you don't have that information — do not "
    "guess. Keep answers concise and specific."
)

_MAX_TOKENS = 1500
_CITE_RE = re.compile(r"\[(\d+)\]")


@lru_cache
def _client() -> AsyncAnthropic:
    settings = get_settings()
    if settings.anthropic_api_key:
        return AsyncAnthropic(api_key=settings.anthropic_api_key)
    return AsyncAnthropic()  # falls back to ANTHROPIC_API_KEY / ambient creds


def _passage_location(chunk: RetrievedChunk) -> str:
    if chunk.page_start == chunk.page_end:
        return f"p.{chunk.page_start}"
    return f"pp.{chunk.page_start}-{chunk.page_end}"


def build_context(chunks: list[RetrievedChunk]) -> str:
    return "\n\n".join(
        f"[{i}] {c.document_title} — {_passage_location(c)}\n{c.content}"
        for i, c in enumerate(chunks, start=1)
    )


def build_messages(question: str, chunks: list[RetrievedChunk]) -> list[dict]:
    return [
        {
            "role": "user",
            "content": (
                f"Context passages:\n\n{build_context(chunks)}\n\n"
                f"---\nQuestion: {question}"
            ),
        }
    ]


async def stream_answer(
    question: str,
    chunks: list[RetrievedChunk],
    *,
    client: AsyncAnthropic | None = None,
) -> AsyncIterator[str]:
    client = client or _client()
    # thinking disabled for snappy first-token streaming; valid on claude-sonnet-5.
    async with client.messages.stream(
        model=get_settings().anthropic_model,
        max_tokens=_MAX_TOKENS,
        system=SYSTEM_PROMPT,
        thinking={"type": "disabled"},
        messages=build_messages(question, chunks),
    ) as stream:
        async for text in stream.text_stream:
            yield text


def _pretty_title(title: str) -> str:
    return title.removesuffix(".pdf").replace("_", " ").strip()


def extract_citations(answer: str, chunks: list[RetrievedChunk]) -> list[str]:
    """Map the [n] markers Claude emitted to `"<title> — page N"` strings,
    in first-seen order, deduped."""
    labels: list[str] = []
    for match in _CITE_RE.finditer(answer):
        index = int(match.group(1))
        if 1 <= index <= len(chunks):
            chunk = chunks[index - 1]
            label = f"{_pretty_title(chunk.document_title)} — page {chunk.page_start}"
            if label not in labels:
                labels.append(label)
    return labels
