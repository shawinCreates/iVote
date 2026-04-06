from __future__ import annotations
from typing import List, Optional
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.models import User, UserRole
from app.services.audit_notification_service import _audit, _notify

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