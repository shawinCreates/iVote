from __future__ import annotations
import base64
import re
import time
from collections import defaultdict
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.responses import RedirectResponse
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.services.auth_services import (
    apply_password_reset, audit_registration_resumed,
    complete_registration, get_user_by_email, get_user_by_reset_token,
    get_user_by_tu, save_stage1_user, save_stage2_info, save_stage3_id_card,
    set_password_reset_token,
)
from app.services.audit_notification_service import _audit, get_notifications, mark_notifications_read
from app.utils.dependencies import get_current_user
from app.utils.helpers import authenticate, create_token
from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas.schemas import NotificationOut, TokenOut, UserOut
from app.core.config import _EXT_MAP, _MAX_PHOTO_BYTES, CANDIDATE_PHOTO_DIR, ID_CARD_DIR, PROFILE_PHOTO_DIR
from app.core.security import hash_password
from app.core.email_service import generate_reset_token, reset_token_expiry, send_password_reset_email


router = APIRouter(prefix="/api/auth", tags=["Auth"])

_login_attempts: dict[str, list[float]] = defaultdict(list)
_MAX_ATTEMPTS = 5
_WINDOW_SEC   = 300

_PASSWORD_RE = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$')
_SAFE_TU_RE  = re.compile(r'^\d{1,2}-\d{1,2}-\d{2,4}-\d{3,4}-\d{4}$')
_EMAIL_RE    = re.compile(r'^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$')


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


@router.post("/login", response_model=TokenOut)
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
    from app.db.models import RegistrationStage, UserRole
    if user.role in (UserRole.STUDENT, UserRole.CANDIDATE) and user.registration_stage != RegistrationStage.COMPLETE:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Your registration is incomplete. Please finish all registration steps before logging in.",
        )
    _login_attempts[ip] = []
    token = create_token(user.id, user.role.value)
    return TokenOut(access_token=token, user=user)


# ── Multi-stage Registration ──────────────────────────────────────────────────

@router.post("/register/stage1", status_code=201)
async def register_stage1(
    tu_registration_number: str = Form(...),
    email:                  str = Form(...),
    password:               str = Form(...),
    db: Session = Depends(get_db),
):
    """Stage 1 — TU reg number, email, password."""
    if not email.strip():
        raise HTTPException(400, detail="Email is required")
    if not _EMAIL_RE.match(email.strip()):
        raise HTTPException(400, detail="Please enter a valid email address")
    if not _SAFE_TU_RE.match(tu_registration_number.strip()):
        raise HTTPException(400, detail=(
            "Invalid TU registration number. Please check your TU registration slip and enter the number exactly as shown."
        ))
    if not _PASSWORD_RE.match(password):
        raise HTTPException(400, detail=(
            "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one symbol (e.g. @, #, !)"
        ))
    if get_user_by_email(db, email):
        raise HTTPException(400, detail="Email is already registered")
    if get_user_by_tu(db, tu_registration_number.strip()):
        raise HTTPException(400, detail="TU registration number is already registered")

    user  = save_stage1_user(db, email.strip().lower(), tu_registration_number.strip(), password)
    token = create_token(user.id, user.role.value)
    return {"user_id": user.id, "stage_token": token, "stage": "stage1_complete"}


@router.post("/register/stage2")
async def register_stage2(
    full_name: str             = Form(...),
    faculty:   str             = Form(...),
    program:   str             = Form(...),
    year:      int             = Form(...),
    semester:  Optional[int]  = Form(None),
    db: Session        = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Stage 2 — Academic details."""
    if not full_name.strip():
        raise HTTPException(400, detail="Full name is required")
    if not re.match(r"^[^\d]+$", full_name.strip()):
        raise HTTPException(400, detail="Full name must not contain numbers")
    if year < 1 or year > 5:
        raise HTTPException(400, detail="Year must be between 1 and 5")
    if semester is not None and (semester < 1 or semester > 10):
        raise HTTPException(400, detail="Semester must be between 1 and 10")
    save_stage2_info(db, user, full_name.strip(), faculty, program.strip(), year, semester)
    return {"stage": "stage2_complete"}


@router.post("/register/stage3")
async def register_stage3(
    id_card: UploadFile = File(...),
    db: Session         = Depends(get_db),
    user: User          = Depends(get_current_user),
):
    """Stage 3 — Upload ID card."""
    ALLOWED_TYPES = {"image/jpeg", "image/png", "image/jpg"}
    ALLOWED_EXTS  = {".jpg", ".jpeg", ".png"}
    filename_ext  = ("." + id_card.filename.rsplit(".", 1)[-1].lower()) if id_card.filename and "." in id_card.filename else ""
    if id_card.content_type not in ALLOWED_TYPES and filename_ext not in ALLOWED_EXTS:
        raise HTTPException(400, detail="Only JPG or PNG images are allowed (max 5 MB)")
    content = await id_card.read()
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(400, detail="ID card file must be smaller than 5 MB")
    ext  = _EXT_MAP[id_card.content_type]
    dest = ID_CARD_DIR / f"id_{user.tu_registration_number}{ext}"
    with dest.open("wb") as f:
        f.write(content)
    save_stage3_id_card(db, user, f"uploads/id_cards/id_{user.tu_registration_number}{ext}")
    return {"stage": "stage3_complete"}


@router.post("/register/stage4", response_model=UserOut)
async def register_stage4(
    photo_data: str    = Form(...),   # base64 data-URI from browser camera
    db: Session        = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Stage 4 — Capture profile photo from front camera."""
    if not photo_data.startswith("data:image"):
        raise HTTPException(400, detail="Expected a base64 image data-URI")
    try:
        _, b64    = photo_data.split(",", 1)
        img_bytes = base64.b64decode(b64)
    except Exception:
        raise HTTPException(400, detail="Invalid image data")
    dest = PROFILE_PHOTO_DIR / f"profile_{user.tu_registration_number}.jpg"
    with dest.open("wb") as f:
        f.write(img_bytes)
    return complete_registration(db, user, f"uploads/profile_photo/profile_{user.tu_registration_number}.jpg")

@router.post("/forgot-password")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, email.strip().lower())
    if user and user.is_active:
        token = generate_reset_token()
        set_password_reset_token(db, user, token, reset_token_expiry())
        send_password_reset_email(user.email, user.full_name or "Student", token)
    return {"message": "If that email is registered, a reset link has been sent."}

@router.post("/reset-password")
async def reset_password(
    token:    str = Form(...),
    password: str = Form(...),
    db: Session   = Depends(get_db),
):
    if not _PASSWORD_RE.match(password):
        raise HTTPException(400, detail=(
            "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one symbol (e.g. @, #, !)"
        ))
    user = get_user_by_reset_token(db, token)
    if not user:
        raise HTTPException(400, detail="Reset link is invalid or has expired.")
    apply_password_reset(db, user, password)
    return {"message": "Password has been reset. You can now log in."}

# ── Registration Resume ────────────────────────────────────────────────────────

@router.post("/register/resume")
async def resume_registration(
    email:    str = Form(...),
    password: str = Form(...),
    db: Session   = Depends(get_db),
):
    """
    Allow a student who dropped out mid-registration to resume.
    Verifies email + password, returns a fresh JWT and their current stage.
    The frontend uses the stage to skip completed steps.
    """
    from app.db.models import RegistrationStage
    from app.utils.helpers import authenticate

    user = authenticate(db, email.strip().lower(), password)
    if not user:
        raise HTTPException(401, detail="Email or password is incorrect")

    if user.is_verified:
        raise HTTPException(400, detail="Your account is already fully registered and verified. Please log in normally.")

    if user.registration_stage == RegistrationStage.COMPLETE:
        raise HTTPException(400, detail="Registration is already complete. Awaiting admin verification. Please log in normally.")

    token = create_token(user.id, user.role.value)
    audit_registration_resumed(db, user.id, user.registration_stage.value)
    return {
        "user_id": user.id,
        "token":   token,
        "stage":   user.registration_stage.value,
        "full_name": user.full_name,
        "faculty":   user.faculty,
        "program":   user.program,
        "year":      user.year,
        "semester":  user.semester,
    }

@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/me/photo")
async def my_photo(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    from fastapi.responses import FileResponse
    from app.services.auth_services import get_user_profile_photo_path
    path = get_user_profile_photo_path(db, user.id)
    if not path:
        raise HTTPException(404, detail="No profile photo")
    return FileResponse(str(path))


@router.get("/notifications", response_model=list[NotificationOut])
async def fetch_notifications(
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
