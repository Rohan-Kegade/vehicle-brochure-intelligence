from functools import lru_cache

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

_INSECURE_JWT_SECRET = "dev-only-insecure-change-me-0123456789abcdefghij"

VERSION = "0.1.0"


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_name: str = "Vehicle Brochure Intelligence"
    environment: str = "development"
    log_level: str = "info"
    version: str = VERSION

    # Comma-separated list of allowed CORS origins.
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    # Infrastructure (defaults match backend/docker-compose.yml).
    database_url: str = "postgresql+asyncpg://vbi:vbi@localhost:5433/vbi"
    qdrant_url: str = "http://localhost:6333"
    qdrant_collection: str = "chunks"

    # Where uploaded source PDFs are written (local FS now; S3 key prefix later).
    storage_dir: str = "storage"

    # Gemini (grounded generation). Key resolves from GEMINI_API_KEY /
    # GOOGLE_API_KEY if unset.
    gemini_api_key: str | None = None
    gemini_model: str = "gemini-2.5-flash"

    # Retrieved chunks fed to the model per question.
    retrieval_top_k: int = 8

    # --- Auth / sessions ---------------------------------------------------
    # HS256 signing key for access tokens. The default is a placeholder that
    # only works while `environment == "development"` — see the validator below.
    jwt_secret: str = _INSECURE_JWT_SECRET
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    # Cookie flags. `cookie_secure=True` in any deployed environment.
    cookie_secure: bool = False
    cookie_samesite: str = "lax"

    # Where the browser app runs — OAuth callbacks redirect here when done.
    frontend_base_url: str = "http://localhost:5173"

    # Google OAuth (optional; "Continue with Google" is disabled when unset).
    google_oauth_client_id: str | None = None
    google_oauth_client_secret: str | None = None
    google_oauth_redirect_uri: str = "http://localhost:8000/auth/google/callback"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]

    @property
    def google_oauth_configured(self) -> bool:
        return bool(self.google_oauth_client_id and self.google_oauth_client_secret)

    @model_validator(mode="after")
    def _require_real_jwt_secret_outside_dev(self) -> "Settings":
        if self.environment != "development" and self.jwt_secret == _INSECURE_JWT_SECRET:
            raise ValueError(
                "JWT_SECRET must be set to a real value when ENVIRONMENT is not 'development'."
            )
        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()
