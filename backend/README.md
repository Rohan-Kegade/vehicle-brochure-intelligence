# Vehicle Brochure Intelligence — Backend

RAG backend for querying vehicle brochures. FastAPI + LangChain + Postgres + Qdrant.

The RAG pipeline runs on LangChain: fastembed embeddings behind a
`langchain_core.embeddings.Embeddings`, `QdrantVectorStore` for the vector
index, an `EnsembleRetriever` (RRF) fusing Qdrant with a Postgres full-text
retriever, and `ChatGoogleGenerativeAI` (Gemini) for streamed generation.

## Requirements

- Python 3.12 (managed by `uv`)
- Docker (for Postgres + Qdrant, from step 1b onward)

## Setup

```bash
cd backend
uv sync
cp .env.example .env
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

Then check <http://localhost:8000/health>.

API docs: <http://localhost:8000/docs>
