"""Grounded generation: build a labeled-context prompt, stream Gemini's answer,
and turn its inline [n] markers into frontend-style citation strings.

The LLM lives entirely behind this module — swap `_client` / `stream_answer`
to change providers without touching the API layer.
"""

import re
from collections.abc import AsyncIterator
from functools import lru_cache

from google import genai
from google.genai import types

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
def _client() -> genai.Client:
    settings = get_settings()
    if settings.gemini_api_key:
        return genai.Client(api_key=settings.gemini_api_key)
    return genai.Client()  # falls back to GEMINI_API_KEY / GOOGLE_API_KEY


def _passage_location(chunk: RetrievedChunk) -> str:
    if chunk.page_start == chunk.page_end:
        return f"p.{chunk.page_start}"
    return f"pp.{chunk.page_start}-{chunk.page_end}"


def build_context(chunks: list[RetrievedChunk]) -> str:
    return "\n\n".join(
        f"[{i}] {c.document_title} — {_passage_location(c)}\n{c.content}"
        for i, c in enumerate(chunks, start=1)
    )


def build_prompt(question: str, chunks: list[RetrievedChunk]) -> str:
    return (
        f"Context passages:\n\n{build_context(chunks)}\n\n"
        f"---\nQuestion: {question}"
    )


async def stream_answer(
    question: str,
    chunks: list[RetrievedChunk],
    *,
    client: genai.Client | None = None,
) -> AsyncIterator[str]:
    client = client or _client()
    config = types.GenerateContentConfig(
        system_instruction=SYSTEM_PROMPT,
        max_output_tokens=_MAX_TOKENS,
        temperature=0.2,
        # Disable "thinking" for snappy first-token streaming (Gemini 2.5 Flash).
        thinking_config=types.ThinkingConfig(thinking_budget=0),
    )
    stream = await client.aio.models.generate_content_stream(
        model=get_settings().gemini_model,
        contents=build_prompt(question, chunks),
        config=config,
    )
    async for chunk in stream:
        if chunk.text:
            yield chunk.text


def _pretty_title(title: str) -> str:
    return title.removesuffix(".pdf").replace("_", " ").strip()


def extract_citations(answer: str, chunks: list[RetrievedChunk]) -> list[str]:
    """Map the [n] markers the model emitted to `"<title> — page N"` strings,
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
