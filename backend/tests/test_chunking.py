from app.models import ChunkKind
from app.services.chunking import chunk_document, estimate_tokens
from app.services.parsing import ParsedDocument, ParsedPage, ParsedTable


def _doc(pages: dict[int, str], tables: list[ParsedTable] | None = None) -> ParsedDocument:
    return ParsedDocument(
        page_count=len(pages),
        pages=[ParsedPage(number=n, text=t) for n, t in sorted(pages.items())],
        tables=tables or [],
    )


def test_estimate_tokens() -> None:
    assert estimate_tokens("") == 1
    assert estimate_tokens("a" * 400) == 100


def test_text_split_into_multiple_overlapping_chunks() -> None:
    words = [f"w{i}" for i in range(400)]
    parsed = _doc({1: " ".join(words)})

    chunks = chunk_document(parsed, target_tokens=40, overlap_ratio=0.15)

    assert len(chunks) > 1
    assert all(c.kind is ChunkKind.text for c in chunks)
    # target 40 tok -> ~160 chars; allow slack for the final partial window.
    assert all(c.token_count <= 55 for c in chunks)

    # consecutive windows share a tail/head of words.
    first_tail = set(chunks[0].content.split()[-5:])
    second_head = set(chunks[1].content.split()[:10])
    assert first_tail & second_head


def test_text_reassembles_in_order_and_covers_all_words() -> None:
    words = [f"w{i}" for i in range(200)]
    parsed = _doc({1: " ".join(words)})

    chunks = chunk_document(parsed, target_tokens=30, overlap_ratio=0.2)
    seen = {w for c in chunks for w in c.content.split()}

    assert seen == set(words)


def test_page_spans_are_anchored_and_monotonic() -> None:
    parsed = _doc({
        1: " ".join(f"a{i}" for i in range(120)),
        2: " ".join(f"b{i}" for i in range(120)),
        3: " ".join(f"c{i}" for i in range(120)),
    })

    chunks = chunk_document(parsed, target_tokens=50, overlap_ratio=0.1)

    starts = [c.page_start for c in chunks]
    assert starts == sorted(starts)
    for c in chunks:
        assert 1 <= c.page_start <= c.page_end <= 3
    # a chunk that begins on page 1 with only "a" words stays on page 1
    assert any(c.page_start == c.page_end == 1 for c in chunks)


def test_tables_become_atomic_single_page_chunks() -> None:
    parsed = _doc(
        {1: " ".join(f"w{i}" for i in range(50))},
        tables=[ParsedTable(page=2, markdown="| A | B |\n| --- | --- |\n| 1 | 2 |")],
    )

    chunks = chunk_document(parsed, target_tokens=40)
    tables = [c for c in chunks if c.kind is ChunkKind.table]

    assert len(tables) == 1
    assert tables[0].page_start == tables[0].page_end == 2
    assert tables[0].content.startswith("| A | B |")
    assert tables[0].token_count == estimate_tokens(tables[0].content)


def test_empty_document_yields_no_chunks() -> None:
    assert chunk_document(_doc({1: "", 2: "   "})) == []
