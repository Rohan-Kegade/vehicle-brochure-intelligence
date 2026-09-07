import uuid

from pydantic import BaseModel, Field, field_validator

from app.services.retrieval import RetrievalMode

_MODE_ALIASES = {
    "balanced": RetrievalMode.balanced,
    "meaning": RetrievalMode.meaning,
    "meaning-based": RetrievalMode.meaning,
    "keyword": RetrievalMode.keyword,
}


class MessageCreate(BaseModel):
    content: str = Field(min_length=1, description="The user's question.")
    mode: RetrievalMode = RetrievalMode.balanced
    # None / empty => search every indexed document.
    document_ids: list[uuid.UUID] | None = None

    @field_validator("mode", mode="before")
    @classmethod
    def _coerce_mode(cls, value: object) -> object:
        if isinstance(value, str):
            return _MODE_ALIASES.get(value.strip().lower(), value)
        return value
