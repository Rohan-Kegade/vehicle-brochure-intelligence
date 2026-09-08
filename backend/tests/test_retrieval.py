import uuid

from langchain_core.documents import Document as LCDocument
from langchain_core.embeddings import Embeddings

from app.db import async_session_maker
from app.models import Chunk, Document, DocumentStatus
from app.services.embeddings import EMBED_DIM
from app.services.retrieval import RetrievalMode, retrieve
from app.services.vector_store import index_chunks


def _unit(i: int) -> list[float]:
    vec = [0.0] * EMBED_DIM
    vec[i % EMBED_DIM] = 1.0
    return vec


class _SeedEmbedder(Embeddings):
    """Document i -> the orthogonal unit vector e_i (no model download)."""

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [_unit(i) for i in range(len(texts))]

    def embed_query(self, text: str) -> list[float]:
        return _unit(0)


class _QueryEmbedder(Embeddings):
    """Query vector = unit vector at `target` (matches the seeded chunk there)."""

    def __init__(self, target: int) -> None:
        self.target = target

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        raise NotImplementedError

    def embed_query(self, text: str) -> list[float]:
        return _unit(self.target)


async def _seed(
    passages: list[tuple[str, int]],
    *,
    user_id: uuid.UUID,
    title: str = "Aurora_GT.pdf",
) -> uuid.UUID:
    """Insert a ready Document with one Chunk per passage, plus an orthogonal
    unit vector per chunk (chunk i -> e_i) into Qdrant."""
    async with async_session_maker() as session:
        doc = Document(
            user_id=user_id,
            title=title,
            tag="Sedan",
            status=DocumentStatus.ready,
            page_count=max(p for _, p in passages),
        )
        session.add(doc)
        await session.flush()

        rows = [
            Chunk(
                document_id=doc.id,
                page_start=page,
                page_end=page,
                kind="text",
                content=content,
                token_count=10,
            )
            for content, page in passages
        ]
        session.add_all(rows)
        await session.flush()

        lc_docs = [
            LCDocument(
                page_content=row.content,
                metadata={
                    "chunk_id": str(row.id),
                    "document_id": str(doc.id),
                    "user_id": str(user_id),
                    "document_title": title,
                    "page_start": row.page_start,
                    "page_end": row.page_end,
                    "kind": "text",
                },
            )
            for row in rows
        ]
        await index_chunks(
            lc_docs,
            ids=[str(row.id) for row in rows],
            embedding=_SeedEmbedder(),
        )
        await session.commit()
        return doc.id


_PASSAGES = [
    ("The airbags and crumple zones protect occupants in a frontal impact.", 1),
    ("Maximum towing capacity is 5,000 pounds with the towing package.", 2),
    ("The powertrain warranty covers 5 years or 60,000 miles.", 3),
]


async def test_keyword_retrieval_matches_terms(cleanup_documents, test_user):
    doc_id = await _seed(_PASSAGES, user_id=test_user.id)
    cleanup_documents.append(doc_id)

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="towing capacity",
            user_id=test_user.id,
            mode=RetrievalMode.keyword,
        )

    assert results
    assert "towing" in results[0].content.lower()
    assert results[0].page_start == 2
    assert results[0].document_title == "Aurora_GT.pdf"


async def test_meaning_retrieval_uses_query_vector(cleanup_documents, test_user):
    doc_id = await _seed(_PASSAGES, user_id=test_user.id)
    cleanup_documents.append(doc_id)

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="anything",
            user_id=test_user.id,
            mode=RetrievalMode.meaning,
            embedder=_QueryEmbedder(target=2),
        )

    assert results
    assert results[0].page_start == 3  # chunk index 2 -> e_2


async def test_balanced_fuses_both_arms(cleanup_documents, test_user):
    doc_id = await _seed(_PASSAGES, user_id=test_user.id)
    cleanup_documents.append(doc_id)

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="warranty",  # keyword arm -> page 3
            user_id=test_user.id,
            mode=RetrievalMode.balanced,
            embedder=_QueryEmbedder(target=1),  # vector arm -> page 2
        )

    pages = {r.page_start for r in results}
    assert {2, 3} <= pages
    assert len(results) <= 8


async def test_scope_limits_to_selected_documents(cleanup_documents, test_user):
    doc_a = await _seed(_PASSAGES, user_id=test_user.id, title="Aurora_GT.pdf")
    doc_b = await _seed(
        [("Unrelated towing content for another car.", 1)],
        user_id=test_user.id,
        title="Other.pdf",
    )
    cleanup_documents.extend([doc_a, doc_b])

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="towing",
            user_id=test_user.id,
            mode=RetrievalMode.keyword,
            document_ids=[doc_a],
        )

    assert results
    assert all(r.document_id == doc_a for r in results)


async def test_retrieval_is_scoped_to_the_owner(cleanup_documents, test_user):
    """Chunks are invisible to a different user even with no document filter."""
    mine = await _seed(_PASSAGES, user_id=test_user.id, title="Mine.pdf")
    cleanup_documents.append(mine)

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="towing capacity",
            user_id=uuid.uuid4(),  # a user who owns nothing
            mode=RetrievalMode.balanced,
            embedder=_QueryEmbedder(target=1),
        )

    assert results == []


async def test_no_match_returns_empty(cleanup_documents, test_user):
    doc_id = await _seed(_PASSAGES, user_id=test_user.id)
    cleanup_documents.append(doc_id)

    async with async_session_maker() as session:
        results = await retrieve(
            session,
            query="zzzznonexistentterm",
            user_id=test_user.id,
            mode=RetrievalMode.keyword,
        )

    assert results == []
