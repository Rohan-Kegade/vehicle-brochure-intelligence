"""Page-anchored chunking.

Text is split into ~600-token windows with ~15% overlap, each carrying the
page range it spans. Tables from `parsing.py` become one atomic chunk each.
Token counts are a cheap `len(text) / 4` estimate for now — swap
`estimate_tokens` for a real tokenizer when it matters.
"""

from dataclasses import dataclass

from app.models import ChunkKind
from app.services.parsing import ParsedDocument

TARGET_TOKENS = 600
OVERLAP_RATIO = 0.15
_CHARS_PER_TOKEN = 4


def estimate_tokens(text: str) -> int:
    return max(1, round(len(text) / _CHARS_PER_TOKEN))


@dataclass
class ChunkDraft:
    content: str
    page_start: int
    page_end: int
    kind: ChunkKind
    token_count: int


def _text_chunks(
    parsed: ParsedDocument, target_tokens: int, overlap_ratio: float
) -> list[ChunkDraft]:
    # Flatten every word to (word, page) so a window knows its page span.
    words: list[tuple[str, int]] = [
        (word, page.number)
        for page in parsed.pages
        for word in page.text.split()
    ]
    if not words:
        return []

    target_chars = target_tokens * _CHARS_PER_TOKEN
    overlap_chars = int(target_chars * overlap_ratio)

    drafts: list[ChunkDraft] = []
    start, total = 0, len(words)
    while start < total:
        end, chars = start, 0
        while end < total and chars < target_chars:
            chars += len(words[end][0]) + 1
            end += 1

        window = words[start:end]
        content = " ".join(word for word, _ in window)
        drafts.append(
            ChunkDraft(
                content=content,
                page_start=window[0][1],
                page_end=window[-1][1],
                kind=ChunkKind.text,
                token_count=estimate_tokens(content),
            )
        )

        if end >= total:
            break

        # Step back over the trailing ~overlap_chars so the next window repeats
        # them; keep at least one word of forward progress.
        back, cursor = 0, end
        while cursor > start + 1 and back < overlap_chars:
            cursor -= 1
            back += len(words[cursor][0]) + 1
        start = cursor

    return drafts


def chunk_document(
    parsed: ParsedDocument,
    *,
    target_tokens: int = TARGET_TOKENS,
    overlap_ratio: float = OVERLAP_RATIO,
) -> list[ChunkDraft]:
    drafts = _text_chunks(parsed, target_tokens, overlap_ratio)
    drafts += [
        ChunkDraft(
            content=table.markdown,
            page_start=table.page,
            page_end=table.page,
            kind=ChunkKind.table,
            token_count=estimate_tokens(table.markdown),
        )
        for table in parsed.tables
    ]
    drafts.sort(key=lambda draft: (draft.page_start, draft.page_end, draft.kind.value))
    return drafts
