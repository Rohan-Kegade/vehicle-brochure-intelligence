# Vehicle Brochure Intelligence — Backend

RAG backend for querying vehicle brochures. FastAPI + Postgres + Qdrant.

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
