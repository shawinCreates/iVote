from typing import Optional
from sqlalchemy.orm import Session
from backend.app.db.models import ApprovalStatus, AuditLog, Candidate, Election, ElectionStatus, Notification, User, UserRole, VoterParticipation

def get_admin_stats(db: Session) -> dict:
    return {
        "total_students":        db.query(User).filter(User.is_active == True, User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE])).count(),
        "pending_verifications": db.query(User).filter(User.is_active == True, User.is_verified == False, User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE])).count(),
        "verified_students":     db.query(User).filter(User.is_active == True, User.is_verified == True, User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE])).count(),
        "total_elections":       db.query(Election).count(),
        "active_elections":      db.query(Election).filter(Election.status == ElectionStatus.VOTING_OPEN).count(),
        "pending_candidates":    db.query(Candidate).filter(Candidate.approval_status == ApprovalStatus.PENDING).count(),
        "total_votes_cast":      db.query(VoterParticipation).count(),
    }

def get_audit_logs(db: Session, skip: int = 0, limit: int = 200) -> list:
    return (db.query(AuditLog)
            .order_by(AuditLog.timestamp.desc())
            .offset(skip).limit(limit)
            .all())

def get_notifications(db: Session, user_id: int) -> list:
    return (db.query(Notification)
            .filter(Notification.user_id == user_id)
            .order_by(Notification.created_at.desc())
            .limit(50)
            .all())

def mark_notifications_read(db: Session, user_id: int) -> None:
    (db.query(Notification)
     .filter(Notification.user_id == user_id, Notification.is_read == False)
     .update({"is_read": True}))
    db.commit()


#  Internal helpers
def _audit(db: Session, action: str, user_id: Optional[int],
           election_id: Optional[int] = None, details: str = None,
           ip: str = None) -> None:
    db.add(AuditLog(action=action, user_id=user_id, election_id=election_id,
                    details=details, ip_address=ip))

def _notify(db: Session, user_id: int, title: str, message: str,
            ntype: str = "info", election_id: Optional[int] = None) -> None:
    db.add(Notification(user_id=user_id, title=title, message=message,
                        notification_type=ntype, election_id=election_id))
