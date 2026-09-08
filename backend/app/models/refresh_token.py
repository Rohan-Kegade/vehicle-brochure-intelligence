import uuid
from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db import Base
from app.models.mixins import Timestamps, UUIDPrimaryKey


class RefreshToken(UUIDPrimaryKey, Timestamps, Base):
    """One long-lived session. The raw token lives only in the client cookie;
    we store its SHA-256 so a DB leak can't be replayed. Rotated on every
    refresh (old row gets `revoked_at`) and revoked on logout."""

    __tablename__ = "refresh_tokens"

    user_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    token_hash: Mapped[str] = mapped_column(String(64), nullable=False, unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    user_agent: Mapped[str | None] = mapped_column(String(512))

    user: Mapped["User"] = relationship(back_populates="refresh_tokens")  # noqa: F821
