"""Minimal Google OAuth 2.0 / OpenID Connect client — authorize-URL builder and
authorization-code exchange. Only the `openid email profile` scopes are used.
"""

from dataclasses import dataclass
from urllib.parse import urlencode

import httpx

from app.config import get_settings

_AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth"
_TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token"
_USERINFO_ENDPOINT = "https://openidconnect.googleapis.com/v1/userinfo"
_SCOPES = "openid email profile"


@dataclass
class GoogleProfile:
    sub: str
    email: str
    email_verified: bool
    name: str | None
    picture: str | None


def build_authorize_url(state: str) -> str:
    settings = get_settings()
    params = {
        "client_id": settings.google_oauth_client_id,
        "redirect_uri": settings.google_oauth_redirect_uri,
        "response_type": "code",
        "scope": _SCOPES,
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }
    return f"{_AUTH_ENDPOINT}?{urlencode(params)}"


async def exchange_code(code: str) -> GoogleProfile:
    settings = get_settings()
    async with httpx.AsyncClient(timeout=10) as client:
        token_resp = await client.post(
            _TOKEN_ENDPOINT,
            data={
                "code": code,
                "client_id": settings.google_oauth_client_id,
                "client_secret": settings.google_oauth_client_secret,
                "redirect_uri": settings.google_oauth_redirect_uri,
                "grant_type": "authorization_code",
            },
        )
        token_resp.raise_for_status()
        access_token = token_resp.json()["access_token"]

        info_resp = await client.get(
            _USERINFO_ENDPOINT,
            headers={"Authorization": f"Bearer {access_token}"},
        )
        info_resp.raise_for_status()
        info = info_resp.json()

    return GoogleProfile(
        sub=info["sub"],
        email=info["email"].lower(),
        email_verified=bool(info.get("email_verified")),
        name=info.get("name"),
        picture=info.get("picture"),
    )
