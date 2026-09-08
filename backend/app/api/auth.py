"""Authentication: email/password register + login, session refresh with
rotation, logout, `/auth/me`, and Google OAuth.

Sessions are cookie-based — a short-lived access JWT plus an opaque refresh
token whose hash is stored in `refresh_tokens`. See `app.api.deps` for the
cookie helpers and `app.services.security` for token minting.
"""

import secrets
from datetime import UTC, datetime

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import (
    REFRESH_COOKIE,
    clear_auth_cookies,
    get_current_user,
    set_auth_cookies,
)
from app.config import get_settings
from app.db import get_session
from app.models import OAuthAccount, RefreshToken, User
from app.schemas.auth import LoginRequest, RegisterRequest, UserRead
from app.services import google_oauth
from app.services.security import (
    create_access_token,
    generate_refresh_token,
    hash_password,
    hash_refresh_token,
    refresh_token_expiry,
    verify_password,
)

router = APIRouter(prefix="/auth", tags=["auth"])

_OAUTH_STATE_COOKIE = "oauth_state"


async def _issue_session(
    session: AsyncSession, response: Response, user: User, request: Request
) -> None:
    """Mint an access token + a fresh refresh-token row and write all cookies."""
    raw_refresh, refresh_hash = generate_refresh_token()
    session.add(
        RefreshToken(
            user_id=user.id,
            token_hash=refresh_hash,
            expires_at=refresh_token_expiry(),
            user_agent=(request.headers.get("user-agent") or "")[:512] or None,
        )
    )
    await session.commit()
    set_auth_cookies(response, create_access_token(user.id), raw_refresh)


@router.post("/register", response_model=UserRead, status_code=status.HTTP_201_CREATED)
async def register(
    payload: RegisterRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> User:
    email = payload.email.lower()
    existing = await session.scalar(select(User).where(User.email == email))
    if existing is not None:
        raise HTTPException(status.HTTP_409_CONFLICT, "That email is already registered.")

    user = User(
        email=email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
    )
    session.add(user)
    await session.flush()
    await _issue_session(session, response, user, request)
    await session.refresh(user)
    return user


@router.post("/login", response_model=UserRead)
async def login(
    payload: LoginRequest,
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> User:
    user = await session.scalar(
        select(User).where(User.email == payload.email.lower())
    )
    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Wrong email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Account unavailable.")

    await _issue_session(session, response, user, request)
    return user


@router.post("/refresh", response_model=UserRead)
async def refresh(
    request: Request,
    response: Response,
    session: AsyncSession = Depends(get_session),
) -> User:
    raw = request.cookies.get(REFRESH_COOKIE)
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, "Session expired.")
    if not raw:
        raise unauthorized

    row = await session.scalar(
        select(RefreshToken).where(RefreshToken.token_hash == hash_refresh_token(raw))
    )
    now = datetime.now(UTC)
    if row is None or row.revoked_at is not None or row.expires_at <= now:
        clear_auth_cookies(response)
        raise unauthorized

    user = await session.get(User, row.user_id)
    if user is None or not user.is_active:
        clear_auth_cookies(response)
        raise unauthorized

    row.revoked_at = now  # rotate: the presented token is now spent
    await _issue_session(session, response, user, request)
    return user


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    session: AsyncSession = Depends(get_session),
) -> Response:
    raw = request.cookies.get(REFRESH_COOKIE)
    if raw:
        row = await session.scalar(
            select(RefreshToken).where(
                RefreshToken.token_hash == hash_refresh_token(raw)
            )
        )
        if row is not None and row.revoked_at is None:
            row.revoked_at = datetime.now(UTC)
            await session.commit()

    response = Response(status_code=status.HTTP_204_NO_CONTENT)
    clear_auth_cookies(response)
    return response


@router.get("/me", response_model=UserRead)
async def me(user: User = Depends(get_current_user)) -> User:
    return user


# --- Google OAuth --------------------------------------------------------------


def _require_google_configured() -> None:
    if not get_settings().google_oauth_configured:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND, "Google sign-in is not configured."
        )


@router.get("/google/start")
async def google_start() -> RedirectResponse:
    _require_google_configured()
    state = secrets.token_urlsafe(24)
    response = RedirectResponse(google_oauth.build_authorize_url(state))
    settings = get_settings()
    response.set_cookie(
        _OAUTH_STATE_COOKIE,
        state,
        max_age=600,
        path="/auth",
        httponly=True,
        secure=settings.cookie_secure,
        samesite="lax",
    )
    return response


@router.get("/google/callback")
async def google_callback(
    request: Request,
    state: str = "",
    code: str = "",
    session: AsyncSession = Depends(get_session),
) -> RedirectResponse:
    _require_google_configured()
    settings = get_settings()
    expected_state = request.cookies.get(_OAUTH_STATE_COOKIE)
    if not code or not state or not expected_state or not secrets.compare_digest(
        state, expected_state
    ):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Invalid OAuth callback.")

    profile = await google_oauth.exchange_code(code)
    user = await _find_or_create_google_user(session, profile)

    redirect = RedirectResponse(f"{settings.frontend_base_url}/app")
    redirect.delete_cookie(_OAUTH_STATE_COOKIE, path="/auth")
    await _issue_session(session, redirect, user, request)
    return redirect


async def _find_or_create_google_user(
    session: AsyncSession, profile: google_oauth.GoogleProfile
) -> User:
    linked = await session.scalar(
        select(OAuthAccount).where(
            OAuthAccount.provider == "google",
            OAuthAccount.provider_account_id == profile.sub,
        )
    )
    if linked is not None:
        return await session.get(User, linked.user_id)  # type: ignore[return-value]

    user: User | None = None
    if profile.email_verified:
        user = await session.scalar(select(User).where(User.email == profile.email))

    if user is None:
        user = User(
            email=profile.email,
            full_name=profile.name,
            avatar_url=profile.picture,
            email_verified=profile.email_verified,
        )
        session.add(user)
        await session.flush()
    else:
        user.full_name = user.full_name or profile.name
        user.avatar_url = user.avatar_url or profile.picture
        user.email_verified = user.email_verified or profile.email_verified

    session.add(
        OAuthAccount(
            user_id=user.id, provider="google", provider_account_id=profile.sub
        )
    )
    await session.flush()
    return user


__all__ = ["router"]
