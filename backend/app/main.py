import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.services.schedular_service import start

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
    'https://secureivote.vercel.app',
]
_raw_origins = os.getenv('CORS_ORIGINS', '')
_env_origins = [n for o in _raw_origins.split(',') if (n := _normalize_origin(o))]
ALLOWED_ORIGINS = list(dict.fromkeys(_DEFAULT_ORIGINS + _env_origins))


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

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS or ['*'],
    allow_credentials=False,
    allow_methods=['*'],
    allow_headers=['*'],
)

app.include_router(auth.router)
app.include_router(student_router)
app.include_router(admin_router)
app.include_router(elections.router)
app.include_router(results.router)
app.include_router(users.router)
app.include_router(voting.router)