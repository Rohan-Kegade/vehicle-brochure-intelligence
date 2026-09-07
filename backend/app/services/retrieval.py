"""Retrieval: a LangChain vector retriever (Qdrant) and a Postgres full-text
retriever, combined for the ``balanced`` mode by ``EnsembleRetriever`` (RRF).

Mode mapping (from the UI's header pill):
  meaning  -> Qdrant vector only
  keyword  -> Postgres ts_rank only
  balanced -> both, fused by Reciprocal Rank Fusion (EnsembleRetriever)
"""

import enum
import uuid
from dataclasses import dataclass

from langchain_classic.retrievers import EnsembleRetriever
from langchain_core.callbacks import (
    AsyncCallbackManagerForRetrieverRun,
    CallbackManagerForRetrieverRun,
)
from langchain_core.documents import Document as LCDocument
from langchain_core.embeddings import Embeddings
from langchain_core.retrievers import BaseRetriever
from qdrant_client import models
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.models import Chunk, Document
from app.services.embeddings import get_embedder
from app.services.vector_store import ensure_collection, get_store

_RRF_K = 60


class RetrievalMode(enum.StrEnum):
    meaning = "meaning"
    keyword = "keyword"
    balanced = "balanced"


@dataclass
class RetrievedChunk:
    chunk_id: uuid.UUID
    document_id: uuid.UUID
    document_title: str
    page_start: int
    page_end: int
    kind: str
    content: str
    score: float


def _chunk_document(chunk: Chunk, title: str) -> LCDocument:
    """A Chunk row -> the same LangChain Document shape the vector store holds."""
    return LCDocument(
        page_content=chunk.content,
        metadata={
            "chunk_id": str(chunk.id),
            "document_id": str(chunk.document_id),
            "document_title": title,
            "page_start": chunk.page_start,
            "page_end": chunk.page_end,
            "kind": str(chunk.kind),
        },
    )


def _to_retrieved(doc: LCDocument, score: float) -> RetrievedChunk:
    m = doc.metadata
    return RetrievedChunk(
        chunk_id=uuid.UUID(str(m["chunk_id"])),
        document_id=uuid.UUID(str(m["document_id"])),
        document_title=m["document_title"],
        page_start=int(m["page_start"]),
        page_end=int(m.get("page_end", m["page_start"])),
        kind=str(m.get("kind", "text")),
        content=doc.page_content,
        score=score,
    )


def _document_filter(document_ids: list[uuid.UUID] | None) -> models.Filter | None:
    if not document_ids:
        return None
    return models.Filter(
        must=[
            models.FieldCondition(
                key="metadata.document_id",
                match=models.MatchAny(any=[str(d) for d in document_ids]),
            )
        ]
    )


class _QdrantRetriever(BaseRetriever):
    """Dense vector search over Qdrant, on the sync client via a threadpool."""

    embedder: Embeddings
    k: int
    document_ids: list[uuid.UUID] | None = None

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[LCDocument]:
        return get_store(self.embedder).similarity_search(
            query, k=self.k, filter=_document_filter(self.document_ids)
        )

    async def _aget_relevant_documents(
        self, query: str, *, run_manager: AsyncCallbackManagerForRetrieverRun
    ) -> list[LCDocument]:
        await ensure_collection()
        return await run_in_threadpool(
            get_store(self.embedder).similarity_search,
            query,
            k=self.k,
            filter=_document_filter(self.document_ids),
        )


class _PostgresFtsRetriever(BaseRetriever):
    """``plainto_tsquery`` + ``ts_rank`` over ``chunks.content_tsv`` (async only)."""

    session: AsyncSession
    k: int
    document_ids: list[uuid.UUID] | None = None

    model_config = {"arbitrary_types_allowed": True}

    def _get_relevant_documents(
        self, query: str, *, run_manager: CallbackManagerForRetrieverRun
    ) -> list[LCDocument]:
        raise NotImplementedError("Postgres FTS retriever is async-only.")

    async def _aget_relevant_documents(
        self, query: str, *, run_manager: AsyncCallbackManagerForRetrieverRun
    ) -> list[LCDocument]:
        tsquery = func.plainto_tsquery("english", query)
        stmt = (
            select(Chunk, Document.title)
            .join(Document, Document.id == Chunk.document_id)
            .where(Chunk.content_tsv.op("@@")(tsquery))
            .order_by(func.ts_rank(Chunk.content_tsv, tsquery).desc())
            .limit(self.k)
        )
        if self.document_ids:
            stmt = stmt.where(Chunk.document_id.in_(self.document_ids))
        rows = (await self.session.execute(stmt)).all()
        return [_chunk_document(chunk, title) for chunk, title in rows]


async def retrieve(
    session: AsyncSession,
    *,
    query: str,
    mode: RetrievalMode = RetrievalMode.balanced,
    document_ids: list[uuid.UUID] | None = None,
    limit: int | None = None,
    embedder: Embeddings | None = None,
) -> list[RetrievedChunk]:
    limit = limit or get_settings().retrieval_top_k
    embedder = embedder or get_embedder()

    vector = _QdrantRetriever(embedder=embedder, k=limit, document_ids=document_ids)
    keyword = _PostgresFtsRetriever(session=session, k=limit, document_ids=document_ids)

    if mode is RetrievalMode.meaning:
        docs = await vector.ainvoke(query)
    elif mode is RetrievalMode.keyword:
        docs = await keyword.ainvoke(query)
    else:
        ensemble = EnsembleRetriever(
            retrievers=[vector, keyword],
            weights=[0.5, 0.5],
            c=_RRF_K,
            id_key="chunk_id",
        )
        docs = await ensemble.ainvoke(query)

    docs = docs[:limit]
    # EnsembleRetriever returns RRF-ordered; single arms are already ranked.
    return [_to_retrieved(doc, 1.0 / (i + 1)) for i, doc in enumerate(docs)]
