"""Grounded generation: build a labeled-context prompt, stream Gemini's answer
via LangChain, and derive the citation list from the retrieved passages.

The LLM lives entirely behind this module — swap ``_llm`` / ``stream_answer``
to change providers without touching the API layer.
"""

from collections.abc import AsyncIterator
from functools import lru_cache

from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI

from app.config import get_settings
from app.services.retrieval import RetrievedChunk

SYSTEM_PROMPT = (
    "You are a vehicle-brochure assistant. Answer the user's question using ONLY "
    "the numbered context passages below. If the answer is not in the passages, "
    "say you don't have that information — do not guess. Write in plain prose: do "
    "not add citation markers, footnotes or passage numbers like [1] — the sources "
    "are shown to the user separately. Keep answers concise and specific."
)

_MAX_TOKENS = 1500
_MAX_CITATIONS = 5


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


def collect_citations(
    chunks: list[RetrievedChunk], *, limit: int = _MAX_CITATIONS
) -> list[str]:
    """Turn the retrieved passages into `"<title> — page N"` strings, in
    retrieval order, deduped and capped at ``limit``."""
    labels: list[str] = []
    for chunk in chunks:
        label = f"{_pretty_title(chunk.document_title)} — page {chunk.page_start}"
        if label not in labels:
            labels.append(label)
        if len(labels) >= limit:
            break
    return labels
