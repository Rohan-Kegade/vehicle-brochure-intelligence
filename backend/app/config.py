from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict

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

    # Where uploaded source PDFs are written (local FS now; S3 key prefix later).
    storage_dir: str = "storage"

    @property
    def cors_origin_list(self) -> list[str]:
        return [o.strip() for o in self.cors_origins.split(",") if o.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()
