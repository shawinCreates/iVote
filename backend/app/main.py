import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from app.db.database import engine, Base
from app.services.schedular_service import start
from app.core.middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware
)

from app.routers import auth, elections, results, users, voting
from app.routers.candidates import student_router, admin_router

Base.metadata.create_all(bind=engine)


def _normalize_origin(origin: str) -> str | None:
    origin = origin.strip().rstrip('/')
    if not origin:
        return None
    if origin == '*':
        return origin
    if not origin.startswith('http://') and not origin.startswith('https://'):
        origin = f'https://{origin}'
    return origin

_DEFAULT_ORIGINS = [
    'http://localhost:3000',
]
_raw_origins = os.getenv('CORS_ORIGINS', '')
_env_origins = [n for o in _raw_origins.split(',') if (n := _normalize_origin(o))]
ALLOWED_ORIGINS = list(dict.fromkeys(_DEFAULT_ORIGINS + _env_origins))


class DevFallbackCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        if request.method == "OPTIONS":
            response = Response(status_code=200)
        else:
            response = await call_next(request)

        response.headers["Access-Control-Allow-Origin"] = "*"
        response.headers["Access-Control-Allow-Methods"] = "*"
        response.headers["Access-Control-Allow-Headers"] = "*"
        response.headers["Access-Control-Allow-Credentials"] = "true"
        response.headers["Access-Control-Max-Age"] = "600"
        return response


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    try:
        start()
    except Exception as e:
        print(f"[WARNING] Scheduler failed to start: {e}")
    yield
    # Shutdown (add cleanup here if needed)


app = FastAPI(
    title="iVote API",
    description="Backend service for iVote application",
    version="1.0.0",
    lifespan=lifespan,
)

# Add fallback CORS middleware first so every response carries the header.
app.add_middleware(DevFallbackCORSMiddleware)

# Add standard CORS middleware for proper OPTIONS/preflight behavior.
app.add_middleware(
    CORSMiddleware,
    allow_origins=['*'],  # development convenience
    allow_credentials=True,
    allow_methods=['*'],
    allow_headers=['*'],
)

# Add custom middleware (order matters - first added is first executed)
app.add_middleware(SecurityHeadersMiddleware)
app.add_middleware(RequestLoggingMiddleware)
app.add_middleware(RateLimitMiddleware, max_requests=100, window_seconds=60)

app.include_router(auth.router)
app.include_router(student_router)
app.include_router(admin_router)
app.include_router(elections.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(voting.router)
