from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.api import auth, conversations, documents, health
from app.api.deps import csrf_ok
from app.config import get_settings

settings = get_settings()

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Endpoints that legitimately take an unsafe method with no CSRF cookie yet
# (the request that mints it, or a redirect landing from Google).
_CSRF_EXEMPT_PREFIXES = (
    "/auth/register",
    "/auth/login",
    "/auth/refresh",
    "/auth/logout",
    "/auth/google",
)


@app.middleware("http")
async def csrf_guard(request: Request, call_next):
    path = request.url.path
    if not path.startswith(_CSRF_EXEMPT_PREFIXES) and not csrf_ok(request):
        return JSONResponse(
            {"detail": "Missing or invalid CSRF token."},
            status_code=status.HTTP_403_FORBIDDEN,
        )
    return await call_next(request)


app.include_router(health.router)
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(conversations.router)


@app.get("/", tags=["health"])
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs", "health": "/health"}
