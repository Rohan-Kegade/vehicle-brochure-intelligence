import contextlib
import uuid
from collections.abc import AsyncIterator

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.pool import NullPool

from app.config import get_settings
from app.db import get_session
from app.main import app
from app.models import Document
from app.services import vector_store
from app.services.storage import get_storage

# These tests exercise the real dev stack: `docker compose up -d` must be
# running with migrations applied. Each test tracks the rows/files it creates
# and removes them on teardown.
#
# A dedicated NullPool engine is used so every connection is opened and closed
# within the same test's event loop (pooled asyncpg connections cannot cross
# the per-test loop boundary on Windows).

_engine = create_async_engine(get_settings().database_url, poolclass=NullPool)
_session_maker = async_sessionmaker(_engine, class_=AsyncSession, expire_on_commit=False)


@pytest_asyncio.fixture(scope="session", autouse=True)
async def _dispose_engine() -> AsyncIterator[None]:
    yield
    await _engine.dispose()


@pytest_asyncio.fixture(autouse=True)
async def _reset_loop_bound_singletons() -> AsyncIterator[None]:
    """Each test runs on its own event loop; drop connections/clients bound to
    the previous one so pooled asyncpg conns and the Qdrant httpx client don't
    leak across loops."""
    yield
    from app.db import engine as app_engine
    from app.services import vector_store

    await app_engine.dispose()
    with contextlib.suppress(Exception):
        await vector_store.get_client().close()
    vector_store.get_client.cache_clear()
    vector_store._collection_ready = False


@pytest.fixture(autouse=True)
def _no_background_ingest(monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep HTTP-layer tests off the real ingest pipeline (model download,
    Qdrant writes). Tests that want the pipeline call `ingest_document`
    directly or re-patch this."""

    async def _noop(*_args: object, **_kwargs: object) -> None:
        return None

    monkeypatch.setattr("app.api.documents.ingest_document", _noop)


@pytest_asyncio.fixture
async def client() -> AsyncIterator[AsyncClient]:
    async def _get_test_session() -> AsyncIterator[AsyncSession]:
        async with _session_maker() as session:
            yield session

    app.dependency_overrides[get_session] = _get_test_session
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest_asyncio.fixture
async def cleanup_documents() -> AsyncIterator[list[uuid.UUID]]:
    created: list[uuid.UUID] = []
    yield created
    storage = get_storage()
    async with _session_maker() as session:
        await session.execute(delete(Document).where(Document.id.in_(created)))
        await session.commit()
    for doc_id in created:
        storage.delete(f"{doc_id}.pdf")
        with contextlib.suppress(Exception):  # best-effort vector cleanup
            await vector_store.delete_document(doc_id)


@pytest_asyncio.fixture
def storage_dir() -> str:
    return get_settings().storage_dir
