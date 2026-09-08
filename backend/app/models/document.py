import enum
import uuid

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import Timestamps, UUIDPrimaryKey


class DocumentStatus(enum.StrEnum):
    uploading = "uploading"
    parsing = "parsing"
    embedding = "embedding"
    ready = "ready"
    failed = "failed"


class Document(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "documents"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    title: Mapped[str] = mapped_column(String(512), nullable=False)
    tag: Mapped[str | None] = mapped_column(String(64))

    # Vehicle metadata (populated by extraction later).
    make: Mapped[str | None] = mapped_column(String(128))
    model: Mapped[str | None] = mapped_column(String(128))
    year: Mapped[int | None] = mapped_column(Integer)

    page_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    chunk_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    status: Mapped[DocumentStatus] = mapped_column(
        Enum(DocumentStatus, name="document_status"),
        default=DocumentStatus.uploading,
        nullable=False,
        index=True,
    )
    storage_key: Mapped[str | None] = mapped_column(String(1024))
    error: Mapped[str | None] = mapped_column(Text)

    user: Mapped["User"] = relationship(back_populates="documents")  # noqa: F821

    chunks: Mapped[list["Chunk"]] = relationship(  # noqa: F821
        back_populates="document",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
