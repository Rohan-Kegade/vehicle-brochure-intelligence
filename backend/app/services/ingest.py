"""Ingest orchestration: parse -> chunk -> embed -> index, driving a
document's `status` from `uploading` to `ready` (or `failed`).

M1 runs this inline via FastAPI `BackgroundTasks`; M2 moves it to an arq
worker. The blocking parse call is pushed to a thread; embedding + Qdrant
upsert happen on a threadpool inside `vector_store.index_chunks`.
"""

import uuid

from langchain_core.documents import Document as LCDocument
from langchain_core.embeddings import Embeddings
from starlette.concurrency import run_in_threadpool

from app.db import async_session_maker
from app.models import Chunk, Document, DocumentStatus
from app.services.chunking import chunk_document
from app.services.parsing import parse_pdf
from app.services.storage import get_storage
from app.services.vector_store import index_chunks


async def ingest_document(document_id: uuid.UUID, *, embedder: Embeddings | None = None) -> None:
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

                lc_docs = [
                    LCDocument(
                        page_content=row.content,
                        metadata={
                            "chunk_id": str(row.id),
                            "document_id": str(doc.id),
                            "user_id": str(doc.user_id),
                            "document_title": doc.title,
                            "page_start": row.page_start,
                            "page_end": row.page_end,
                            "kind": str(row.kind),
                        },
                    )
                    for row in rows
                ]
                await index_chunks(
                    lc_docs,
                    ids=[str(row.id) for row in rows],
                    embedding=embedder,
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
