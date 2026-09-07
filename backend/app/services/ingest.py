"""Ingest orchestration: parse -> chunk -> embed -> index, driving a
document's `status` from `uploading` to `ready` (or `failed`).

M1 runs this inline via FastAPI `BackgroundTasks`; M2 moves it to an arq
worker. The blocking parse/embed calls are pushed to a thread so the event
loop stays free.
"""

import uuid

from starlette.concurrency import run_in_threadpool

from app.db import async_session_maker
from app.models import Chunk, Document, DocumentStatus
from app.services.chunking import chunk_document
from app.services.embeddings import Embedder, get_embedder
from app.services.parsing import parse_pdf
from app.services.storage import get_storage
from app.services.vector_store import upsert_chunks


async def ingest_document(document_id: uuid.UUID, *, embedder: Embedder | None = None) -> None:
    embedder = embedder or get_embedder()

    async with async_session_maker() as session:
        doc = await session.get(Document, document_id)
        if doc is None or doc.storage_key is None:
            return

        try:
            doc.status = DocumentStatus.parsing
            await session.commit()

            path = get_storage().path_for(doc.storage_key)
            parsed = await run_in_threadpool(parse_pdf, path)
            drafts = chunk_document(parsed)

            doc.page_count = parsed.page_count
            doc.status = DocumentStatus.embedding
            await session.commit()

            if drafts:
                vectors = await run_in_threadpool(
                    embedder.embed_documents, [d.content for d in drafts]
                )
                rows = [
                    Chunk(
                        document_id=doc.id,
                        page_start=d.page_start,
                        page_end=d.page_end,
                        kind=d.kind.value,
                        content=d.content,
                        token_count=d.token_count,
                    )
                    for d in drafts
                ]
                session.add_all(rows)
                await session.flush()  # assign row.id
                await upsert_chunks(
                    [
                        (
                            row.id,
                            vector,
                            {"document_id": str(doc.id), "page_start": row.page_start},
                        )
                        for row, vector in zip(rows, vectors, strict=True)
                    ]
                )

            doc.chunk_count = len(drafts)
            doc.status = DocumentStatus.ready
            await session.commit()

        except Exception as exc:
            await session.rollback()
            doc = await session.get(Document, document_id)
            if doc is not None:
                doc.status = DocumentStatus.failed
                doc.error = str(exc)[:2000]
                await session.commit()
            raise
