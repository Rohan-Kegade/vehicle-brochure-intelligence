import uuid
from pathlib import Path

from fastapi import (
    APIRouter,
    BackgroundTasks,
    Depends,
    File,
    Form,
    HTTPException,
    Response,
    UploadFile,
    status,
)
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.db import get_session
from app.models import Document, User
from app.schemas.document import DocumentRead
from app.services.ingest import ingest_document
from app.services.storage import LocalStorage, get_storage
from app.services.vector_store import delete_document as delete_document_vectors

router = APIRouter(prefix="/documents", tags=["documents"])

_PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


def _looks_like_pdf(upload: UploadFile) -> bool:
    name = (upload.filename or "").lower()
    return upload.content_type in _PDF_CONTENT_TYPES or name.endswith(".pdf")


def _storage_key(user_id: uuid.UUID, document_id: uuid.UUID) -> str:
    """PDFs are partitioned by owner: ``{user_id}/{document_id}.pdf``."""
    return f"{user_id}/{document_id}.pdf"


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    background: BackgroundTasks,
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    tag: str | None = Form(default=None),
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: LocalStorage = Depends(get_storage),
) -> Document:
    """Accept a brochure PDF, persist the file, and create its `documents` row.

    The row is returned immediately in `status = uploading`; ingest (parse ->
    chunk -> embed -> index) runs in the background and drives it to `ready`.
    """
    if not _looks_like_pdf(file):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported.",
        )

    doc = Document(
        user_id=user.id,
        title=title or Path(file.filename or "document.pdf").stem,
        tag=tag,
    )
    session.add(doc)
    await session.flush()  # assign doc.id before we name the file

    doc.storage_key = await storage.save(_storage_key(user.id, doc.id), file)
    await session.commit()
    await session.refresh(doc)

    background.add_task(ingest_document, doc.id)
    return doc


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> list[Document]:
    result = await session.execute(
        select(Document)
        .where(Document.user_id == user.id)
        .order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())


@router.get("/{document_id}", response_model=DocumentRead)
async def get_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> Document:
    """Fetch a single document — used by the frontend to poll ingest status."""
    doc = await session.scalar(
        select(Document).where(
            Document.id == document_id, Document.user_id == user.id
        )
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
    return doc


@router.delete("/{document_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_document(
    document_id: uuid.UUID,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
    storage: LocalStorage = Depends(get_storage),
) -> Response:
    """Delete a brochure and everything derived from it (chunks cascade, Qdrant
    points and the stored PDF are removed here)."""
    doc = await session.scalar(
        select(Document).where(
            Document.id == document_id, Document.user_id == user.id
        )
    )
    if doc is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")

    await delete_document_vectors(doc.id)
    if doc.storage_key:
        storage.delete(doc.storage_key)
    await session.delete(doc)
    await session.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)
