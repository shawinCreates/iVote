import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.db.database import engine, Base
from app.services.schedular_service import start

from app.routers import auth, elections, results, users, voting
from app.routers.candidates import student_router, admin_router


Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="iVote API",
    description="Backend service for iVote application",
    version="1.0.0"
)

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
_env_origins = []
for origin in _raw_origins.split(','):
    normalized = _normalize_origin(origin)
    if normalized:
        _env_origins.append(normalized)

ALLOWED_ORIGINS = list(dict.fromkeys(_DEFAULT_ORIGINS + _env_origins))

# Allow the public frontend origin and any additional explicitly configured origins.
# The browser will receive the required Access-Control-Allow-Origin header for cross-site fetches.
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

@app.on_event("startup")
async def startup():
    start()
