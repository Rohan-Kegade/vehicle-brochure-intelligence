from pathlib import Path

from fastapi import UploadFile

from app.config import get_settings

_CHUNK_SIZE = 1 << 20  # 1 MiB


class LocalStorage:
    """Filesystem-backed blob storage.

    Keys are relative POSIX-style paths under ``base_dir``. The
    ``save`` / ``path_for`` / ``delete`` surface is intentionally small so an
    S3-backed implementation can be dropped in without touching callers.
    """

    def __init__(self, base_dir: str | Path) -> None:
        self.base_dir = Path(base_dir)

    def path_for(self, key: str) -> Path:
        return self.base_dir / key

    async def save(self, key: str, upload: UploadFile) -> str:
        """Stream ``upload`` to ``key`` and return the key."""
        dest = self.path_for(key)
        dest.parent.mkdir(parents=True, exist_ok=True)
        with dest.open("wb") as fh:
            while chunk := await upload.read(_CHUNK_SIZE):
                fh.write(chunk)
        return key

    def delete(self, key: str) -> None:
        self.path_for(key).unlink(missing_ok=True)


def get_storage() -> LocalStorage:
    return LocalStorage(get_settings().storage_dir)
