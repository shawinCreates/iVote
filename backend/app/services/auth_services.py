from __future__ import annotations
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import List, Optional
import os

from dotenv import load_dotenv
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from backend.app.core.security import hash_password, verify_password
from backend.app.db.database import get_db
from backend.app.db.models import Notification, User, UserRole
from backend.app.services.audit_notification_service import _audit, _notify

load_dotenv(dotenv_path=Path(__file__).resolve().parents[3] / ".env")



from backend.app.db.models import AuditLog, Notification


def _audit(
    db: Session,
    action: str,
    user_id: Optional[int],
    election_id: Optional[int] = None,
    details: Optional[str] = None,
    ip: Optional[str] = None,
) -> None:
    """Append an audit log row. Call before db.commit() in the same transaction."""
    db.add(AuditLog(
        action=action,
        user_id=user_id,
        election_id=election_id,
        details=details,
        ip_address=ip,
    ))


def _notify(
    db: Session,
    user_id: int,
    title: str,
    message: str,
    notification_type: str = "info",
    election_id: Optional[int] = None,
) -> None:
    """Create an in-app notification row. Call before db.commit() in the same transaction."""
    db.add(Notification(
        user_id=user_id,
        title=title,
        message=message,
        notification_type=notification_type,
        election_id=election_id,
    ))


# Fix #1: No insecure default — fail loudly if SECRET_KEY is missing
SECRET_KEY = os.getenv("SECRET_KEY")
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY is not set in .env. "
        "Generate one with: python -c \"import secrets; print(secrets.token_hex(32))\""
    )

ALGORITHM               = os.getenv("ALGORITHM", "HS256")
# Fix #18: Reduced from 480 min (8h) to 60 min; configurable via env
ACCESS_TOKEN_EXPIRE_MIN = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", 60))

oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# User
def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_tu(db: Session, tu: str) -> Optional[User]:
    return db.query(User).filter(User.tu_registration_number == tu).first()

def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()

def create_student(db: Session, email: str, full_name: str, tu: str,
                   faculty: str, year: int, password: str,
                   id_card_path: str) -> User:
    user = User(
        email=email, full_name=full_name, tu_registration_number=tu,
        faculty=faculty, year=year,
        password_hash=hash_password(password),
        id_card_path=id_card_path,
        role=UserRole.STUDENT,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user

def get_pending_students(db: Session) -> List[User]:
    return (db.query(User)
            .filter(User.is_verified == False,
                    User.is_active == True,
                    User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]))
            .order_by(User.created_at)
            .all())

def get_all_students(db: Session) -> List[User]:
    return (db.query(User)
            .filter(User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
                    User.is_active == True)
            .order_by(User.created_at)
            .all())

def verify_student(db: Session, user_id: int, admin_id: int,
                   ip: str = None) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    try:
        user.is_verified = True
        _audit(db, "STUDENT_VERIFIED", admin_id,
               details=f"Verified user ID {user_id}", ip=ip)  # Fix #28: no PII in details
        _notify(db, user_id, "Account Verified ✅",
                "Your student account has been verified. You can now participate in elections.",
                "success")
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    return user

def reject_student(db: Session, user_id: int, admin_id: int,
                   reason: str = None, ip: str = None) -> bool:
    user = get_user(db, user_id)
    if not user:
        return False
    user.is_active = False
    user.rejection_reason = reason or "Registration not approved."
    _audit(db, "STUDENT_REJECTED", admin_id,
           details=f"Rejected user ID {user_id}", ip=ip)  # Fix #28: no PII
    db.commit()
    return True


# ── Token helpers ──────────────────────────────────────────────────────────

def create_token(user_id: int, role: str) -> str:
    # Fix #27: Use timezone-aware datetime
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MIN)
    return jwt.encode(
        {"sub": str(user_id), "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user


# ── FastAPI dependencies ───────────────────────────────────────────────────

async def get_current_user(
    token: str = Depends(oauth2),
    db: Session = Depends(get_db),
) -> User:
    exc = HTTPException(
        status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise exc
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise exc
    if not user.is_active:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Your account has been deactivated.",
        )
    return user


async def require_verified(user: User = Depends(get_current_user)) -> User:
    if user.role == UserRole.ELECTION_HEAD:
        return user          # admin is always verified
    if not user.is_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Your account is pending verification by the Election Head.",
        )
    return user


async def require_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != UserRole.ELECTION_HEAD:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Admin access required.",
        )
    return user

# ── Notifications ─────────────────────────────────────────────────────────

def get_notifications(db: Session, user_id: int) -> List[Notification]:
    return (
        db.query(Notification)
        .filter(Notification.user_id == user_id)
        .order_by(Notification.created_at.desc())
        .limit(25)
        .all()
    )


def mark_notifications_read(db: Session, user_id: int) -> None:
    (
        db.query(Notification)
        .filter(Notification.user_id == user_id, Notification.is_read == False)
        .update({"is_read": True})
    )
    db.commit()
