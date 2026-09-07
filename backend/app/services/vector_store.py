"""Qdrant write-side: collection bootstrap, chunk upsert, per-document delete.

Search lives in `retrieval.py` (step 5); this module keeps the Qdrant client
and the collection contract in one place. Points are keyed by chunk id with
payload `{document_id, page_start}`.
"""

import uuid
from functools import lru_cache

from qdrant_client import AsyncQdrantClient, models

from app.config import get_settings
from app.services.embeddings import EMBED_DIM

_collection_ready = False


@lru_cache
def get_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=get_settings().qdrant_url)


async def ensure_collection(dim: int = EMBED_DIM) -> None:
    """Create the collection on first use (idempotent, once per process)."""
    global _collection_ready
    if _collection_ready:
        return
    client = get_client()
    name = get_settings().qdrant_collection
    if not await client.collection_exists(name):
        await client.create_collection(
            collection_name=name,
            vectors_config=models.VectorParams(size=dim, distance=models.Distance.COSINE),
        )
    _collection_ready = True


async def upsert_chunks(
    points: list[tuple[uuid.UUID, list[float], dict]],
) -> None:
    if not points:
        return
    await ensure_collection(len(points[0][1]))
    await get_client().upsert(
        collection_name=get_settings().qdrant_collection,
        points=[
            models.PointStruct(id=str(pid), vector=vector, payload=payload)
            for pid, vector, payload in points
        ],
    )


async def delete_document(document_id: uuid.UUID) -> None:
    """Remove every point belonging to a document."""
    await get_client().delete(
        collection_name=get_settings().qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
    )
