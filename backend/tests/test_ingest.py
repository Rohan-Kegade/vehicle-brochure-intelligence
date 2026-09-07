import uuid
from pathlib import Path

import pymupdf
import pytest
from langchain_core.embeddings import Embeddings
from qdrant_client import models
from sqlalchemy import func, select

from app.config import get_settings
from app.db import async_session_maker
from app.models import Chunk, Document, DocumentStatus
from app.services.embeddings import EMBED_DIM
from app.services.ingest import ingest_document
from app.services.vector_store import get_client


class FakeEmbedder(Embeddings):
    """Deterministic 384-dim vectors — no model download in tests."""

    dim = EMBED_DIM

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        out = []
        for i, _ in enumerate(texts):
            vec = [0.0] * self.dim
            vec[i % self.dim] = 1.0
            out.append(vec)
        return out

    def embed_query(self, text: str) -> list[float]:
        return self.embed_documents([text])[0]


def _brochure(path: Path) -> None:
    doc = pymupdf.open()
    for body in ("SPORT sedan " * 60, "SAFETY features " * 60, "WARRANTY terms " * 60):
        page = doc.new_page()
        page.insert_textbox(pymupdf.Rect(50, 50, 545, 780), body, fontsize=11)
    doc.save(str(path))
    doc.close()


async def _new_document(storage_key: str | None) -> uuid.UUID:
    async with async_session_maker() as session:
        doc = Document(title="Test Brochure", tag="SUV", storage_key=storage_key)
        session.add(doc)
        await session.commit()
        return doc.id


async def _count_qdrant_points(document_id: uuid.UUID) -> int:
    result = await get_client().count(
        collection_name=get_settings().qdrant_collection,
        count_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="metadata.document_id",
                    match=models.MatchValue(value=str(document_id)),
                )
            ]
        ),
    )
    return result.count


async def test_ingest_drives_document_to_ready(cleanup_documents):
    storage_dir = Path(get_settings().storage_dir)
    storage_dir.mkdir(parents=True, exist_ok=True)

    doc_id = await _new_document(storage_key=None)
    cleanup_documents.append(doc_id)

    key = f"{doc_id}.pdf"
    _brochure(storage_dir / key)
    async with async_session_maker() as session:
        doc = await session.get(Document, doc_id)
        doc.storage_key = key
        await session.commit()

    await ingest_document(doc_id, embedder=FakeEmbedder())

    async with async_session_maker() as session:
        doc = await session.get(Document, doc_id)
        assert doc.status is DocumentStatus.ready
        assert doc.page_count == 3
        assert doc.chunk_count > 0
        assert doc.error is None

        row_count = await session.scalar(
            select(func.count()).select_from(Chunk).where(Chunk.document_id == doc_id)
        )
    assert row_count == doc.chunk_count
    assert await _count_qdrant_points(doc_id) == doc.chunk_count


async def test_ingest_marks_failed_on_missing_file(cleanup_documents):
    doc_id = await _new_document(storage_key="does-not-exist.pdf")
    cleanup_documents.append(doc_id)

    with pytest.raises((FileNotFoundError, RuntimeError)):
        await ingest_document(doc_id, embedder=FakeEmbedder())

    async with async_session_maker() as session:
        doc = await session.get(Document, doc_id)
    assert doc.status is DocumentStatus.failed
    assert doc.error
