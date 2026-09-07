"""Retrieval: Qdrant vector search + Postgres full-text search, fused with RRF.

Mode mapping (from the UI's header pill):
  meaning  -> Qdrant vector only
  keyword  -> Postgres ts_rank only
  balanced -> both, combined by Reciprocal Rank Fusion
"""

import enum
import uuid
from dataclasses import dataclass

from qdrant_client import models
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.models import Chunk, Document
from app.services.embeddings import Embedder, get_embedder
from app.services.vector_store import ensure_collection, get_client

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


async def _vector_ranked(
    query: str,
    document_ids: list[uuid.UUID] | None,
    limit: int,
    embedder: Embedder,
) -> list[uuid.UUID]:
    await ensure_collection()
    vector = await run_in_threadpool(embedder.embed_query, query)

    query_filter = None
    if document_ids:
        query_filter = models.Filter(
            must=[
                models.FieldCondition(
                    key="document_id",
                    match=models.MatchAny(any=[str(d) for d in document_ids]),
                )
            ]
        )

    result = await get_client().query_points(
        collection_name=get_settings().qdrant_collection,
        query=vector,
        query_filter=query_filter,
        limit=limit,
        with_payload=False,
    )
    return [uuid.UUID(str(point.id)) for point in result.points]


async def _keyword_ranked(
    session: AsyncSession,
    query: str,
    document_ids: list[uuid.UUID] | None,
    limit: int,
) -> list[uuid.UUID]:
    tsquery = func.plainto_tsquery("english", query)
    stmt = (
        select(Chunk.id)
        .where(Chunk.content_tsv.op("@@")(tsquery))
        .order_by(func.ts_rank(Chunk.content_tsv, tsquery).desc())
        .limit(limit)
    )
    if document_ids:
        stmt = stmt.where(Chunk.document_id.in_(document_ids))
    return list((await session.execute(stmt)).scalars().all())


async def _hydrate(
    session: AsyncSession, chunk_ids: list[uuid.UUID]
) -> dict[uuid.UUID, RetrievedChunk]:
    if not chunk_ids:
        return {}
    rows = (
        await session.execute(
            select(Chunk, Document.title)
            .join(Document, Document.id == Chunk.document_id)
            .where(Chunk.id.in_(chunk_ids))
        )
    ).all()
    return {
        chunk.id: RetrievedChunk(
            chunk_id=chunk.id,
            document_id=chunk.document_id,
            document_title=title,
            page_start=chunk.page_start,
            page_end=chunk.page_end,
            kind=chunk.kind,
            content=chunk.content,
            score=0.0,
        )
        for chunk, title in rows
    }


def _rrf(*ranked_lists: list[uuid.UUID]) -> list[tuple[uuid.UUID, float]]:
    scores: dict[uuid.UUID, float] = {}
    for ranked in ranked_lists:
        for rank, chunk_id in enumerate(ranked):
            scores[chunk_id] = scores.get(chunk_id, 0.0) + 1.0 / (_RRF_K + rank + 1)
    return sorted(scores.items(), key=lambda kv: kv[1], reverse=True)


async def retrieve(
    session: AsyncSession,
    *,
    query: str,
    mode: RetrievalMode = RetrievalMode.balanced,
    document_ids: list[uuid.UUID] | None = None,
    limit: int | None = None,
    embedder: Embedder | None = None,
) -> list[RetrievedChunk]:
    limit = limit or get_settings().retrieval_top_k
    embedder = embedder or get_embedder()

    if mode is RetrievalMode.meaning:
        ranked = await _vector_ranked(query, document_ids, limit, embedder)
        fused = [(cid, 1.0 / (i + 1)) for i, cid in enumerate(ranked)]
    elif mode is RetrievalMode.keyword:
        ranked = await _keyword_ranked(session, query, document_ids, limit)
        fused = [(cid, 1.0 / (i + 1)) for i, cid in enumerate(ranked)]
    else:
        vector_ranked = await _vector_ranked(query, document_ids, limit, embedder)
        keyword_ranked = await _keyword_ranked(session, query, document_ids, limit)
        fused = _rrf(vector_ranked, keyword_ranked)[:limit]

    hydrated = await _hydrate(session, [cid for cid, _ in fused])
    out: list[RetrievedChunk] = []
    for chunk_id, score in fused:
        chunk = hydrated.get(chunk_id)
        if chunk is not None:
            chunk.score = score
            out.append(chunk)
    return out
