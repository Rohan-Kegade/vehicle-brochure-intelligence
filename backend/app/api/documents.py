from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Document
from app.schemas.document import DocumentRead
from app.services.storage import LocalStorage, get_storage

router = APIRouter(prefix="/documents", tags=["documents"])

_PDF_CONTENT_TYPES = {"application/pdf", "application/x-pdf"}


def _looks_like_pdf(upload: UploadFile) -> bool:
    name = (upload.filename or "").lower()
    return upload.content_type in _PDF_CONTENT_TYPES or name.endswith(".pdf")


@router.post("", response_model=DocumentRead, status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    title: str | None = Form(default=None),
    tag: str | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
    storage: LocalStorage = Depends(get_storage),
) -> Document:
    """Accept a brochure PDF, persist the file, and create its `documents` row.

    The row starts in `status = uploading`; the ingest pipeline (parse -> chunk
    -> embed) drives it forward in later steps.
    """
    if not _looks_like_pdf(file):
        raise HTTPException(
            status_code=status.HTTP_415_UNSUPPORTED_MEDIA_TYPE,
            detail="Only PDF uploads are supported.",
        )

    doc = Document(
        title=title or Path(file.filename or "document.pdf").stem,
        tag=tag,
    )
    session.add(doc)
    await session.flush()  # assign doc.id before we name the file

    doc.storage_key = await storage.save(f"{doc.id}.pdf", file)
    await session.commit()
    await session.refresh(doc)
    return doc


@router.get("", response_model=list[DocumentRead])
async def list_documents(
    session: AsyncSession = Depends(get_session),
) -> list[Document]:
    result = await session.execute(
        select(Document).order_by(Document.created_at.desc())
    )
    return list(result.scalars().all())
