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

_DEFAULT_ORIGINS = [
    "https://secureivote.vercel.app",
]
_raw_origins = os.getenv("CORS_ORIGINS", "")
_env_origins = []
for origin in _raw_origins.split(","):
    origin = origin.strip()
    if not origin:
        continue
    if not origin.startswith("http://") and not origin.startswith("https://"):
        origin = f"https://{origin}"
    _env_origins.append(origin)

ALLOWED_ORIGINS = list(dict.fromkeys(_DEFAULT_ORIGINS + _env_origins))

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
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
