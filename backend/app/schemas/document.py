import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models import DocumentStatus


class DocumentRead(BaseModel):
    # from_attributes: build straight from the ORM object.
    # protected_namespaces=(): allow the ``model`` field (a vehicle model).
    model_config = ConfigDict(from_attributes=True, protected_namespaces=())

    id: uuid.UUID
    title: str
    tag: str | None
    make: str | None
    model: str | None
    year: int | None
    page_count: int
    chunk_count: int
    status: DocumentStatus
    created_at: datetime
    updated_at: datetime
