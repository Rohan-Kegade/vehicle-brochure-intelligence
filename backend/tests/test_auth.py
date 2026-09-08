import contextlib
import uuid
from collections.abc import AsyncIterator

import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from sqlalchemy import delete

from app.main import app
from app.models import User

_MINIMAL_PDF = b"""%PDF-1.4
1 0 obj<< /Type /Catalog /Pages 2 0 R >>endobj
2 0 obj<< /Type /Pages /Kids [3 0 R] /Count 1 >>endobj
3 0 obj<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] >>endobj
trailer<< /Size 4 /Root 1 0 R >>
%%EOF
"""


@pytest_asyncio.fixture
async def created_emails() -> AsyncIterator[list[str]]:
    emails: list[str] = []
    yield emails
    # conftest overrides get_session for `client`, not `anon_client`; use the
    # app's own session maker here.
    from app.db import async_session_maker

    async with async_session_maker() as session:
        await session.execute(delete(User).where(User.email.in_(emails)))
        await session.commit()


def _email() -> str:
    return f"auth-{uuid.uuid4().hex[:12]}@example.com"


def _csrf(client: AsyncClient) -> dict[str, str]:
    token = client.cookies.get("csrf_token")
    return {"x-csrf-token": token} if token else {}


async def test_register_sets_session_cookies(anon_client, created_emails):
    email = _email()
    created_emails.append(email)

    resp = await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )
    assert resp.status_code == 201
    assert resp.json()["email"] == email
    for name in ("access_token", "refresh_token", "csrf_token"):
        assert name in anon_client.cookies


async def test_me_requires_a_session(anon_client, created_emails):
    assert (await anon_client.get("/auth/me")).status_code == 401

    email = _email()
    created_emails.append(email)
    await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )

    me = await anon_client.get("/auth/me")
    assert me.status_code == 200 and me.json()["email"] == email


async def test_login_rejects_wrong_password(anon_client, created_emails):
    email = _email()
    created_emails.append(email)
    await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )

    bad = await anon_client.post(
        "/auth/login", json={"email": email, "password": "nope"}
    )
    assert bad.status_code == 401

    good = await anon_client.post(
        "/auth/login", json={"email": email, "password": "hunter2hunter"}
    )
    assert good.status_code == 200


async def test_duplicate_registration_conflicts(anon_client, created_emails):
    email = _email()
    created_emails.append(email)
    first = await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )
    assert first.status_code == 201
    dup = await anon_client.post(
        "/auth/register", json={"email": email.upper(), "password": "hunter2hunter"}
    )
    assert dup.status_code == 409


async def test_refresh_rotates_and_invalidates_the_old_token(
    anon_client, created_emails
):
    email = _email()
    created_emails.append(email)
    await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )
    old_refresh = anon_client.cookies.get("refresh_token")

    rotated = await anon_client.post("/auth/refresh")
    assert rotated.status_code == 200
    assert anon_client.cookies.get("refresh_token") != old_refresh

    # A fresh client carrying only the now-spent refresh token.
    transport = ASGITransport(app=app)
    async with AsyncClient(
        transport=transport,
        base_url="http://test",
        cookies={"refresh_token": old_refresh},
    ) as stale:
        assert (await stale.post("/auth/refresh")).status_code == 401


async def test_logout_revokes_the_session(anon_client, created_emails):
    email = _email()
    created_emails.append(email)
    await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )

    assert (await anon_client.post("/auth/logout")).status_code == 204
    assert (await anon_client.get("/auth/me")).status_code == 401


async def test_unsafe_request_without_csrf_is_forbidden(anon_client, created_emails):
    email = _email()
    created_emails.append(email)
    await anon_client.post(
        "/auth/register", json={"email": email, "password": "hunter2hunter"}
    )

    # Authenticated, but no X-CSRF-Token header echoing the cookie.
    resp = await anon_client.post(
        "/documents",
        files={"file": ("x.pdf", _MINIMAL_PDF, "application/pdf")},
    )
    assert resp.status_code == 403


async def test_documents_are_isolated_between_tenants(created_emails):
    transport = ASGITransport(app=app)
    async with (
        AsyncClient(transport=transport, base_url="http://a") as a,
        AsyncClient(transport=transport, base_url="http://b") as b,
    ):
        for cli in (a, b):
            email = _email()
            created_emails.append(email)
            await cli.post(
                "/auth/register", json={"email": email, "password": "hunter2hunter"}
            )

        up = await a.post(
            "/documents",
            files={"file": ("A.pdf", _MINIMAL_PDF, "application/pdf")},
            headers=_csrf(a),
        )
        assert up.status_code == 201
        doc_id = up.json()["id"]

        assert (await a.get(f"/documents/{doc_id}")).status_code == 200
        assert (await b.get(f"/documents/{doc_id}")).status_code == 404
        assert doc_id not in {d["id"] for d in (await b.get("/documents")).json()}

        with contextlib.suppress(Exception):
            await a.delete(f"/documents/{doc_id}", headers=_csrf(a))
