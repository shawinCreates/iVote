from pathlib import Path
from datetime import timedelta
from dotenv import load_dotenv
import os

# ── Base directory ────────────────────────────────────────────────────────────
# config.py lives at: backend/app/core/config.py
# parents[3] resolves to the project root (iVote/) on both local and Render,
# because render.yaml sets rootDir: . (repo root), keeping the same structure.
BASE_DIR = Path(__file__).resolve().parents[3]

# load_dotenv is a no-op if .env doesn't exist (e.g. on Render — env vars are
# injected by the platform directly via the dashboard / render.yaml)
load_dotenv(BASE_DIR / ".env")

# ── Required secrets ──────────────────────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError(
        "DATABASE_URL is not set. "
        "Add it to your .env file (local) or Render environment variables (production)."
    )

SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set. "
        "Add it to your .env file (local) or Render environment variables (production)."
    )

# ── JWT ───────────────────────────────────────────────────────────────────────
ALGORITHM = os.getenv("ALGORITHM") or "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))
ACCESS_TOKEN_EXPIRE_DELTA = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

# ── File storage ──────────────────────────────────────────────────────────────
# In production (Cloudinary), CLOUDINARY_CLOUD_NAME is set and files are
# uploaded to the cloud — local upload dirs are not needed.
# In development, we create the local dirs so saves work out of the box.
_USE_CLOUD = bool(os.getenv("CLOUDINARY_CLOUD_NAME", ""))

UPLOAD_DIR         = BASE_DIR / "uploads"
ID_CARD_DIR        = UPLOAD_DIR / "id_cards"
CANDIDATE_PHOTO_DIR = UPLOAD_DIR / "candidates_photo"
PROFILE_PHOTO_DIR  = UPLOAD_DIR / "profile_photo"

if not _USE_CLOUD:
    ID_CARD_DIR.mkdir(parents=True, exist_ok=True)
    CANDIDATE_PHOTO_DIR.mkdir(parents=True, exist_ok=True)
    PROFILE_PHOTO_DIR.mkdir(parents=True, exist_ok=True)

# ── Upload validation ─────────────────────────────────────────────────────────
_ALLOWED_PHOTO_TYPES = {"image/jpeg", "image/png", "image/jpg"}
_MAX_PHOTO_BYTES     = 5 * 1024 * 1024   # 5 MB

_EXT_MAP = {
    "image/jpeg":      ".jpg",
    "image/jpg":       ".jpg",
    "image/png":       ".png",
    "application/pdf": ".pdf",
}