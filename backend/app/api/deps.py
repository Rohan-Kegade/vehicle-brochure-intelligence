"""Shared request dependencies: the authenticated-user dependency, auth-cookie
helpers, and the CSRF double-submit check.
"""

import secrets

from fastapi import Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db import get_session
from app.models import User
from app.services.security import InvalidToken, decode_access_token

ACCESS_COOKIE = "access_token"
REFRESH_COOKIE = "refresh_token"
CSRF_COOKIE = "csrf_token"
CSRF_HEADER = "x-csrf-token"

# The refresh cookie is scoped to this path so it is only ever sent to the
# auth endpoints that consume it.
REFRESH_COOKIE_PATH = "/auth"

_UNSAFE_METHODS = {"POST", "PUT", "PATCH", "DELETE"}


async def get_current_user(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> User:
    token = request.cookies.get(ACCESS_COOKIE)
    if not token:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated.")
    try:
        user_id = decode_access_token(token)
    except InvalidToken as exc:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid session.") from exc

    user = await session.get(User, user_id)
    if user is None or not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account unavailable.")
    return user


def new_csrf_token() -> str:
    return secrets.token_urlsafe(32)


def csrf_ok(request: Request) -> bool:
    """Double-submit: the header must match the (non-httpOnly) cookie. Safe
    methods always pass."""
    if request.method not in _UNSAFE_METHODS:
        return True
    cookie = request.cookies.get(CSRF_COOKIE)
    header = request.headers.get(CSRF_HEADER)
    return bool(cookie and header and secrets.compare_digest(cookie, header))


def set_auth_cookies(response: Response, access_token: str, refresh_token: str) -> None:
    settings = get_settings()
    common = {
        "secure": settings.cookie_secure,
        "samesite": settings.cookie_samesite,
        "httponly": True,
    }
    response.set_cookie(
        ACCESS_COOKIE,
        access_token,
        max_age=settings.access_token_ttl_minutes * 60,
        path="/",
        **common,
    )
    response.set_cookie(
        REFRESH_COOKIE,
        refresh_token,
        max_age=settings.refresh_token_ttl_days * 86400,
        path=REFRESH_COOKIE_PATH,
        **common,
    )
    # Readable by JS so the SPA can echo it back in the CSRF header.
    response.set_cookie(
        CSRF_COOKIE,
        new_csrf_token(),
        max_age=settings.refresh_token_ttl_days * 86400,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        httponly=False,
    )


def clear_auth_cookies(response: Response) -> None:
    settings = get_settings()
    opts = {"secure": settings.cookie_secure, "samesite": settings.cookie_samesite}
    response.delete_cookie(ACCESS_COOKIE, path="/", httponly=True, **opts)
    response.delete_cookie(
        REFRESH_COOKIE, path=REFRESH_COOKIE_PATH, httponly=True, **opts
    )
    response.delete_cookie(CSRF_COOKIE, path="/", httponly=False, **opts)
