import enum
import uuid

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import Timestamps, UUIDPrimaryKey


class MessageRole(enum.StrEnum):
    user = "user"
    assistant = "assistant"


class Message(UUIDPrimaryKey, Timestamps, Base):
    __tablename__ = "messages"

    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    role: Mapped[str] = mapped_column(String(16), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)

    # Assistant turns only: the citation strings shown under the answer.
    citations: Mapped[list[str] | None] = mapped_column(JSONB)
    # Retrieval mode the answer was produced with (assistant turns).
    mode: Mapped[str | None] = mapped_column(String(16))

    conversation: Mapped["Conversation"] = relationship(  # noqa: F821
        back_populates="messages"
    )
