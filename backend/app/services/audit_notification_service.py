from __future__ import annotations
from typing import Optional

from sqlalchemy.orm import Session

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
