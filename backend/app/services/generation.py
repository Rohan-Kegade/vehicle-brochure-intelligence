"""Grounded generation: build a labeled-context prompt, stream Gemini's answer
via LangChain, and turn its inline [n] markers into frontend-style citation
strings.

The LLM lives entirely behind this module — swap ``_llm`` / ``stream_answer``
to change providers without touching the API layer.
"""

import re
from collections.abc import AsyncIterator
from functools import lru_cache

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

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
def _llm() -> ChatGoogleGenerativeAI:
    settings = get_settings()
    kwargs: dict = {}
    if settings.gemini_api_key:
        kwargs["google_api_key"] = settings.gemini_api_key
    return ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        temperature=0.2,
        max_output_tokens=_MAX_TOKENS,
        # Keep thinking minimal for snappy first-token streaming. Gemini 3.x
        # rejects thinking_budget=0, so use the "low" thinking level instead.
        thinking_config={"thinking_level": "low"},
        **kwargs,
    )


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
    llm: ChatGoogleGenerativeAI | None = None,
) -> AsyncIterator[str]:
    llm = llm or _llm()
    messages = [
        SystemMessage(content=SYSTEM_PROMPT),
        HumanMessage(content=build_prompt(question, chunks)),
    ]
    async for chunk in llm.astream(messages):
        text = chunk.text
        if text:
            yield str(text)


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
