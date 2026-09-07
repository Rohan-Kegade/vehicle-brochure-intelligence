"""Embedding provider — a LangChain ``Embeddings`` implementation.

Default: ``BAAI/bge-small-en-v1.5`` (384-dim) via fastembed / ONNX — offline,
no PyTorch. ``get_embedder()`` returns a LangChain ``Embeddings`` so it plugs
straight into ``QdrantVectorStore``; swap it for another provider's
``Embeddings`` without touching callers.
"""

from functools import lru_cache

from langchain_core.embeddings import Embeddings

_MODEL_NAME = "BAAI/bge-small-en-v1.5"
EMBED_DIM = 384

# Kept as an alias so annotations elsewhere read the same as before the
# LangChain migration.
Embedder = Embeddings


class LocalEmbeddings(Embeddings):
    """fastembed-backed dense embeddings. bge models want a retrieval
    instruction on the query side only — ``query_embed`` handles that."""

    def __init__(self, model_name: str = _MODEL_NAME) -> None:
        from fastembed import TextEmbedding

        self._model = TextEmbedding(model_name=model_name)

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [vec.tolist() for vec in self._model.embed(list(texts))]

    def embed_query(self, text: str) -> list[float]:
        return next(iter(self._model.query_embed(text))).tolist()


@lru_cache
def get_embedder() -> Embeddings:
    return LocalEmbeddings()
