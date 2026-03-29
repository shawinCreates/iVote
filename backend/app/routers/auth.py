from __future__ import annotations
import re
import shutil
import time
from collections import defaultdict
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from backend.app.services.auth_services import authenticate, create_student, create_token, get_current_user, get_user_by_email, get_user_by_tu, mark_notifications_read
from db import get_db
from db.models import User
from schemas import schemas

router = APIRouter(prefix="/api/auth", tags=["Auth"])

_BASE_DIR    = Path(__file__).resolve().parents[4]
_ID_CARD_DIR = _BASE_DIR / "uploads" / "id_cards"
_ID_CARD_DIR.mkdir(parents=True, exist_ok=True)

_login_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 10        # max failures per window
_WINDOW_SEC   = 300       # 5-minute window

_MAX_ID_CARD_BYTES = 5 * 1024 * 1024   # 5 MB

_PASSWORD_RE = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')

_SAFE_TU_RE = re.compile(r'^[A-Za-z0-9.\-_]+$')


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    attempts = _login_attempts[ip]
    _login_attempts[ip] = [t for t in attempts if now - t < _WINDOW_SEC]
    if len(_login_attempts[ip]) >= _MAX_ATTEMPTS:
        raise HTTPException(
            status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many login attempts. Please wait 5 minutes before trying again.",
        )


def _record_failure(ip: str) -> None:
    _login_attempts[ip].append(time.time())


@router.post("/login", response_model=schemas.TokenOut)
async def login(
    request: Request,
    form: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    ip = request.client.host
    _check_rate_limit(ip)

    user = authenticate(db, form.username, form.password)
    if not user:
        _record_failure(ip)
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    if not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated. You may re-register with corrected information.",
        )
    _login_attempts[ip] = []
    token = create_token(user.id, user.role.value)
    return schemas.TokenOut(access_token=token, user=user)


@router.post("/register", response_model=schemas.UserOut, status_code=201)
async def register(
    email:                  str        = Form(...),
    full_name:              str        = Form(...),
    tu_registration_number: str        = Form(...),
    faculty:                str        = Form(...),
    year:                   int        = Form(...),
    password:               str        = Form(...),
    id_card:                UploadFile = File(...),
    db: Session = Depends(get_db),
):
    if year < 1 or year > 10:
        raise HTTPException(400, detail="Year must be between 1 and 10")

    if not _PASSWORD_RE.match(password):
        raise HTTPException(
            400,
            detail="Password must be at least 8 characters and contain at least one letter and one digit",
        )

    if get_user_by_email(db, email):
        raise HTTPException(400, detail="Email is already registered")
    if get_user_by_tu(db, tu_registration_number):
        raise HTTPException(400, detail="TU registration number is already registered")

    allowed_types = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
    if id_card.content_type not in allowed_types:
        raise HTTPException(400, detail="ID card must be JPG, PNG, or PDF")

    content = await id_card.read()
    if len(content) > _MAX_ID_CARD_BYTES:
        raise HTTPException(400, detail="ID card file must be smaller than 5 MB")
    import io
    id_card.file = io.BytesIO(content)

    if not _SAFE_TU_RE.match(tu_registration_number):
        raise HTTPException(400, detail="TU registration number contains invalid characters")

    ext_map = {
        "image/jpeg": ".jpg",
        "image/jpg":  ".jpg",
        "image/png":  ".png",
        "application/pdf": ".pdf",
    }
    ext  = ext_map[id_card.content_type]
    dest = _ID_CARD_DIR / f"id_{tu_registration_number}{ext}"
    with dest.open("wb") as f:
        shutil.copyfileobj(id_card.file, f)

    relative = f"uploads/id_cards/id_{tu_registration_number}{ext}"
    return create_student(
        db, email, full_name, tu_registration_number,
        faculty, year, password, relative,
    )


@router.get("/me", response_model=schemas.UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/notifications", response_model=list[schemas.NotificationOut])
async def get_notifications(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    return get_notifications(db, user.id)


@router.post("/notifications/read")
async def mark_read(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    mark_notifications_read(db, user.id)
    return {"ok": True}
