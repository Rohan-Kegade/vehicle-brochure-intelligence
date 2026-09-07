"""Embedding provider behind a small interface.

Default: `BAAI/bge-small-en-v1.5` (384-dim) via fastembed / ONNX — offline,
no PyTorch. Swap `get_embedder` for a Voyage AI provider later without
touching callers.
"""

from functools import lru_cache
from typing import Protocol

_MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384


class Embedder(Protocol):
    dim: int

    def embed_documents(self, texts: list[str]) -> list[list[float]]: ...

    def embed_query(self, text: str) -> list[float]: ...


class LocalEmbedder:
    dim = EMBED_DIM

    def __init__(self, model_name: str = _MODEL_NAME) -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vec.tolist() for vec in self._model.embed(texts)]

    def embed_query(self, text: str) -> list[float]:
        # bge models prepend a retrieval instruction on the query side only;
        # fastembed's query_embed handles that.
        return next(iter(self._model.query_embed(text))).tolist()


@lru_cache
def get_embedder() -> Embedder:
    return LocalEmbedder()
