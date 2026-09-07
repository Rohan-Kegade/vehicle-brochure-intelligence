"""Qdrant write-side + clients, via LangChain's ``QdrantVectorStore``.

Points are keyed by chunk id. Payload follows the LangChain layout:
``{"page_content": <text>, "metadata": {chunk_id, document_id,
document_title, page_start, page_end, kind}}`` — so retrieval reads whole
chunks straight from Qdrant with no Postgres hydration step.

``get_client()`` is the async client used for collection bootstrap and
deletes; the vector store itself drives a sync client on a threadpool so the
event loop is never blocked.
"""

import uuid
from functools import lru_cache

from langchain_core.documents import Document as LCDocument
from langchain_core.embeddings import Embeddings
from langchain_qdrant import QdrantVectorStore, RetrievalMode
from qdrant_client import AsyncQdrantClient, QdrantClient, models
from starlette.concurrency import run_in_threadpool

from app.config import get_settings
from app.services.embeddings import EMBED_DIM, get_embedder

# Empty string == the collection's single unnamed dense vector, which is what
# QdrantVectorStore(vector_name="") and `ensure_collection` below agree on.
_VECTOR_NAME = ""

_collection_ready = False


@lru_cache
def get_client() -> AsyncQdrantClient:
    return AsyncQdrantClient(url=get_settings().qdrant_url)


@lru_cache
def _sync_client() -> QdrantClient:
    return QdrantClient(url=get_settings().qdrant_url)


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


def get_store(embedding: Embeddings | None = None) -> QdrantVectorStore:
    """A vector store bound to the shared sync client. Cheap to build; the
    collection must already exist (call ``ensure_collection`` first)."""
    return QdrantVectorStore(
        client=_sync_client(),
        collection_name=get_settings().qdrant_collection,
        embedding=embedding or get_embedder(),
        retrieval_mode=RetrievalMode.DENSE,
        vector_name=_VECTOR_NAME,
        validate_embeddings=False,
        validate_collection_config=False,
    )


async def index_chunks(
    documents: list[LCDocument],
    ids: list[str],
    *,
    embedding: Embeddings | None = None,
) -> None:
    """Embed and upsert ``documents`` under ``ids`` (chunk ids as strings)."""
    if not documents:
        return
    await ensure_collection()
    store = get_store(embedding)
    await run_in_threadpool(store.add_documents, documents, ids=ids)


async def delete_document(document_id: uuid.UUID) -> None:
    """Remove every point belonging to a document."""
    await get_client().delete(
        collection_name=get_settings().qdrant_collection,
        points_selector=models.FilterSelector(
            filter=models.Filter(
                must=[
                    models.FieldCondition(
                        key="metadata.document_id",
                        match=models.MatchValue(value=str(document_id)),
                    )
                ]
            )
        ),
    )
