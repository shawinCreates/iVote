from __future__ import annotations
from typing import List, Optional
from fastapi import Path
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import User, UserRole
from app.services.audit_notification_service import _audit, _notify
from app.core.config import BASE_DIR


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()


def get_user_by_tu(db: Session, tu: str) -> Optional[User]:
    return db.query(User).filter(User.tu_registration_number == tu).first()


def get_user(db: Session, user_id: int) -> Optional[User]:
    return db.query(User).filter(User.id == user_id).first()


def create_student(
    db: Session, email: str, full_name: str, tu: str,
    faculty: str, year: int, password: str, id_card_path: str,
) -> User:
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
    from app.db.models import RegistrationStage
    return (
        db.query(User)
        .filter(
            User.is_verified == False,
            User.is_active == True,
            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
            User.registration_stage == RegistrationStage.COMPLETE,
        )
        .order_by(User.created_at)
        .all()
    )


def get_all_students(db: Session) -> List[User]:
    return (
        db.query(User)
        .filter(
            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
            User.is_active == True,
        )
        .order_by(User.created_at)
        .all()
    )


def verify_student(
    db: Session, user_id: int, admin_id: int, ip: str = None
) -> Optional[User]:
    user = get_user(db, user_id)
    if not user:
        return None
    try:
        user.is_verified = True
        _audit(db, "STUDENT_VERIFIED", admin_id, actor_role="admin",
               details=f"Verified user ID {user_id}", ip=ip)
        _notify(db, user_id, "Account Verified",
                "Your student account has been verified. You can now participate in elections.",
                "success")
        db.commit()
        db.refresh(user)
    except Exception:
        db.rollback()
        raise
    return user


def reject_student(
    db: Session, user_id: int, admin_id: int,
    reason: str = None, ip: str = None,
) -> bool:
    user = get_user(db, user_id)
    if not user:
        return False
    user.is_active        = False
    user.rejection_reason = reason or "Registration not approved."
    _audit(db, "STUDENT_REJECTED", admin_id, actor_role="admin",
           details=f"Rejected user ID {user_id}", ip=ip) 
    db.commit()
    return True

# ---------------------------------------------------------------------------
# Multi-stage registration persistence
# ---------------------------------------------------------------------------

def save_stage1_user(db: Session, email: str, tu: str, password: str) -> User:
    from app.db.models import RegistrationStage
    from app.core.security import hash_password
    user = User(
        email=email,
        tu_registration_number=tu,
        password_hash=hash_password(password),
        full_name="",
        faculty="",
        year=0,
        role=UserRole.STUDENT,
        registration_stage=RegistrationStage.STAGE1,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def save_stage2_info(
    db: Session, user: User,
    full_name: str, faculty: str, program: str,
    year: int, semester: Optional[int],
) -> None:
    from app.db.models import RegistrationStage
    user.full_name          = full_name
    user.faculty            = faculty
    user.program            = program
    user.year               = year
    user.semester           = semester
    user.registration_stage = RegistrationStage.STAGE2
    db.commit()


def save_stage3_id_card(db: Session, user: User, id_card_path: str) -> None:
    from app.db.models import RegistrationStage
    user.id_card_path       = id_card_path
    user.registration_stage = RegistrationStage.STAGE3
    db.commit()


def complete_registration(db: Session, user: User, photo_path: str) -> User:
    from app.db.models import RegistrationStage
    user.profile_photo_path  = photo_path
    user.registration_stage  = RegistrationStage.COMPLETE
    db.commit()
    db.refresh(user)
    _audit(db, "REGISTRATION_COMPLETE", user.id,
           actor_role="student", details="Registration completed — awaiting verification")
    db.commit()
    return user


def audit_registration_resumed(db: Session, user_id: int, stage_value: str) -> None:
    _audit(db, "REGISTRATION_RESUMED", user_id,
           actor_role="student", details=f"Resumed registration at stage: {stage_value}")
    db.commit()


# ---------------------------------------------------------------------------
# Password reset
# ---------------------------------------------------------------------------

def set_password_reset_token(db: Session, user: User, token: str, expiry) -> None:
    user.reset_token            = token
    user.reset_token_expires_at = expiry
    db.commit()


def get_user_by_reset_token(db: Session, token: str) -> Optional[User]:
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    return (db.query(User)
            .filter(User.reset_token == token,
                    User.reset_token_expires_at > now)
            .first())


def apply_password_reset(db: Session, user: User, new_password: str) -> None:
    from app.core.security import hash_password
    user.password_hash      = hash_password(new_password)
    user.reset_token        = None
    user.reset_token_expires_at = None
    db.commit()


def get_user_id_card_path(db: Session, user_id: int) -> Path | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.id_card_path:
        return None

    path = BASE_DIR / user.id_card_path
    if not path.exists():
        return None

    return path


def get_user_profile_photo_path(db: Session, user_id: int) -> Path | None:
    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.profile_photo_path:
        return None

    path = BASE_DIR / user.profile_photo_path
    if not path.exists():
        return None

    return path
