import os
from contextlib import asynccontextmanager
from datetime import datetime, timezone

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.database import engine, Base, get_db
from app.services.schedular_service import start
from app.core.middleware import (
    SecurityHeadersMiddleware,
    RequestLoggingMiddleware,
    RateLimitMiddleware,
)
from app.routers import auth, elections, results, users, voting
from app.routers.candidates import student_router, admin_router

Base.metadata.create_all(bind=engine)


def _parse_origins(raw: str) -> list[str]:
    origins = []
    for o in raw.split(","):
        o = o.strip().rstrip("/")
        if not o:
            continue
        if o == "*":
            return ["*"]
        if not o.startswith("http://") and not o.startswith("https://"):
            o = f"https://{o}"
        origins.append(o)
    return origins


_DEFAULT_ORIGINS = ["http://localhost:3000"]
_env_origins     = _parse_origins(os.getenv("CORS_ORIGINS", ""))
ALLOWED_ORIGINS  = list(dict.fromkeys(_DEFAULT_ORIGINS + _env_origins)) or ["*"]


@asynccontextmanager
async def lifespan(app: FastAPI):
    try:
        start()
    except Exception as e:
        print(f"[WARNING] Scheduler failed to start: {e}")
    yield


app = FastAPI(
    title="Secure Online Voting System API",
    description="Secure online voting system with homomorphic encryption",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

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


@app.get("/", tags=["Root"], include_in_schema=False)
async def root():
    return {
        "service": "Secure Online Voting System API",
        "version": "1.0.0",
        "status":  "running",
        "docs":    "/docs",
        "health":  "/health",
    }


@app.api_route("/health", methods=["GET", "HEAD"], tags=["Health"])
async def health(db: Session = Depends(get_db)):
    """Liveness + readiness probe used by Render and Railway."""
    db_status = "connected"
    try:
        db.execute(text("SELECT 1"))
    except Exception:
        db_status = "disconnected"

    healthy = db_status == "connected"
    return JSONResponse(
        status_code=200 if healthy else 503,
        content={
            "status":    "healthy" if healthy else "unhealthy",
            "database":  db_status,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        },
    )
