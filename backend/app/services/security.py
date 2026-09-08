"""Password hashing (argon2), access-token minting/verification (JWT HS256),
and opaque refresh-token generation.

Access tokens are stateless and short-lived; refresh tokens are opaque random
strings whose SHA-256 is persisted in `refresh_tokens` so sessions can be
revoked (logout) and rotated.
"""

import hashlib
import secrets
import uuid
from datetime import UTC, datetime, timedelta

import jwt
from pwdlib import PasswordHash

from app.config import get_settings

_pwd = PasswordHash.recommended()

_ALGORITHM = "HS256"
_ACCESS_TOKEN_TYPE = "access"


def hash_password(password: str) -> str:
    return _pwd.hash(password)


def verify_password(password: str, hashed: str | None) -> bool:
    if not hashed:
        return False
    return _pwd.verify(password, hashed)


def create_access_token(user_id: uuid.UUID) -> str:
    settings = get_settings()
    now = datetime.now(UTC)
    payload = {
        "sub": str(user_id),
        "type": _ACCESS_TOKEN_TYPE,
        "iat": now,
        "exp": now + timedelta(minutes=settings.access_token_ttl_minutes),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=_ALGORITHM)


class InvalidToken(Exception):
    """Raised when an access token is missing, malformed, expired, or not ours."""


def decode_access_token(token: str) -> uuid.UUID:
    try:
        payload = jwt.decode(token, get_settings().jwt_secret, algorithms=[_ALGORITHM])
    except jwt.PyJWTError as exc:
        raise InvalidToken(str(exc)) from exc

    if payload.get("type") != _ACCESS_TOKEN_TYPE:
        raise InvalidToken("wrong token type")
    try:
        return uuid.UUID(payload["sub"])
    except (KeyError, ValueError) as exc:
        raise InvalidToken("bad subject") from exc


def hash_refresh_token(raw: str) -> str:
    return hashlib.sha256(raw.encode()).hexdigest()


def generate_refresh_token() -> tuple[str, str]:
    """Return ``(raw, sha256_hex)`` — the raw value goes in the client cookie,
    the hash goes in the database."""
    raw = secrets.token_urlsafe(48)
    return raw, hash_refresh_token(raw)


def refresh_token_expiry() -> datetime:
    return datetime.now(UTC) + timedelta(days=get_settings().refresh_token_ttl_days)
