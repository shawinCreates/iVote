from __future__ import annotations
import base64
import re
import shutil
import time
from collections import defaultdict
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.services.auth_services import create_student, get_user_by_email, get_user_by_tu
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
_MAX_ATTEMPTS = 5       # max failures per window
_WINDOW_SEC   = 300       # 5-minute window

_PASSWORD_RE = re.compile(r'^(?=.*[A-Za-z])(?=.*\d).{8,}$')
_SAFE_TU_RE = re.compile(r'^\d+-\d+-\d+-\d+$')


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
    if not _SAFE_TU_RE.match(tu_registration_number.strip()):
        raise HTTPException(400, detail=(
            "TU registration number must follow the pattern: "
            "digits-digits-digits-digits-digits  (e.g. 2-2-0101-234-2021)"
        ))
    if not _PASSWORD_RE.match(password):
        raise HTTPException(400, detail=(
            "Password must be at least 8 characters with at least one uppercase letter, one lowercase letter, one digit, and one symbol (e.g. @, #, !)"
        ))
    if get_user_by_email(db, email):
        raise HTTPException(400, detail="Email is already registered")
    if get_user_by_tu(db, tu_registration_number.strip()):
        raise HTTPException(400, detail="TU registration number is already registered")

    # Persist a partial user so stage 2 can update it
    from app.db.models import RegistrationStage
    user = User(
        email                  = email.strip().lower(),
        tu_registration_number = tu_registration_number.strip(),
        password_hash          = hash_password(password),
        full_name              = "",
        faculty                = "",
        year                   = 0,
        role                   = UserRole.STUDENT,
        registration_stage     = RegistrationStage.STAGE1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    token = create_token(user.id, user.role.value)
    return {"user_id": user.id, "token": token, "stage": "stage1_complete"}


@router.post("/register/stage2")
async def register_stage2(
    full_name: str     = Form(...),
    faculty:   str     = Form(...),
    program:   str     = Form(...),
    year:      int     = Form(...),
    semester:  int     = Form(None),
    db: Session        = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Stage 2 — Academic details."""
    from app.db.models import RegistrationStage
    if year < 1 or year > 5:
        raise HTTPException(400, detail="Year must be between 1 and 5")
    if semester is not None and (semester < 1 or semester > 10):
        raise HTTPException(400, detail="Semester must be between 1 and 10")

    user.full_name         = full_name.strip()
    user.faculty           = faculty
    user.program           = program.strip()
    user.year              = year
    user.semester          = semester
    user.registration_stage = RegistrationStage.STAGE2
    db.commit()
    return {"stage": "stage2_complete"}


@router.post("/register/stage3")
async def register_stage3(
    id_card: UploadFile = File(...),
    db: Session         = Depends(get_db),
    user: User          = Depends(get_current_user),
):
    """Stage 3 — Upload ID card."""
    from app.db.models import RegistrationStage
    allowed = {"image/jpeg", "image/png", "image/jpg", "application/pdf"}
    if id_card.content_type not in allowed:
        raise HTTPException(400, detail="ID card must be JPG, PNG, or PDF")
    content = await id_card.read()
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(400, detail="ID card file must be smaller than 5 MB")

    ext  = _EXT_MAP[id_card.content_type]
    dest = ID_CARD_DIR / f"id_{user.tu_registration_number}{ext}"
    with dest.open("wb") as f:
        f.write(content)

    user.id_card_path       = f"uploads/id_cards/id_{user.tu_registration_number}{ext}"
    user.registration_stage = RegistrationStage.STAGE3
    db.commit()
    return {"stage": "stage3_complete"}


@router.post("/register/stage4", response_model=UserOut)
async def register_stage4(
    photo_data: str    = Form(...),   # base64 data-URI from browser camera
    db: Session        = Depends(get_db),
    user: User         = Depends(get_current_user),
):
    """Stage 4 — Capture profile photo from front camera."""
    from app.db.models import RegistrationStage
    if not photo_data.startswith("data:image"):
        raise HTTPException(400, detail="Expected a base64 image data-URI")

    try:
        header, b64 = photo_data.split(",", 1)
        img_bytes   = base64.b64decode(b64)
    except Exception:
        raise HTTPException(400, detail="Invalid image data")

    ext  = ".jpg"
    dest = PROFILE_PHOTO_DIR / f"profile_{user.tu_registration_number}{ext}"
    with dest.open("wb") as f:
        f.write(img_bytes)

    user.profile_photo_path  = f"uploads/profile_photo/profile_{user.tu_registration_number}{ext}"
    user.registration_stage  = RegistrationStage.COMPLETE
    db.commit()
    db.refresh(user)
    _audit(db, "REGISTRATION_COMPLETE", user.id,
           actor_role="student", details="Registration completed — awaiting verification")
    db.commit()
    return user

@router.post("/forgot-password")
async def forgot_password(
    email: str = Form(...),
    db: Session = Depends(get_db),
):
    user = get_user_by_email(db, email.strip().lower())
    if user and user.is_active:
        token                  = generate_reset_token()
        user.reset_token       = token
        user.reset_token_expires = reset_token_expiry()
        db.commit()
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
    now  = datetime.now(timezone.utc)
    user = (db.query(User)
            .filter(User.reset_token == token,
                    User.reset_token_expires > now)
            .first())
    if not user:
        raise HTTPException(400, detail="Reset link is invalid or has expired.")
    user.password_hash     = hash_password(password)
    user.reset_token       = None
    user.reset_token_expires = None
    db.commit()
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
    _audit(db, "REGISTRATION_RESUMED", user.id, actor_role="student",
           details=f"Resumed registration at stage: {user.registration_stage.value}")
    db.commit()

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