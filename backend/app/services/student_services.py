from sqlalchemy.orm import Session
from typing import List

from backend.app.db.models import User, UserRole, AuditLog

def get_all_students(db: Session) -> List[User]:
    return db.query(User).filter(User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE])).all()

def get_pending_students(db: Session, skip: int = 0, limit:int =100) -> List[User]:
    return db.query(User).filter(
        User.is_verified == False,
        User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE])
    ).offset(skip).limit(limit).all()

def verify_student(db: Session, user_id: int, admin_id: int) -> User:
    user = db.query(User).filter(user.id == user_id).first()
    if user:
        user.is_verified = True
        db.commit()
        db.refresh(user)
    return user

def reject_student(db: Session, user_id: int, admin_id: int) -> bool:
    user = db.query(User).filter(User.id == user_id).first()
    if user:
        user.is_active = False
        log = AuditLog(action="STUDENT_REJECTED", user_id=admin_id, details=f"Rejected student {user.full_name} (ID: {user_id})")
        db.add(log)
        db.commit()
        return True
    return False