from __future__ import annotations

import csv
import io
from datetime import datetime, timezone
from typing import List, Optional

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.models import (
    AuditLog,
    Candidate,
    ApprovalStatus,
    Election,
    ElectionStatus,
    Position,
    User,
    UserRole,
    VoterParticipation,
)
from app.schemas.schemas import (
    ElectionIn
)
from app.services.audit_notification_service import _audit, _notify


def _now() -> datetime:
    return datetime.now(timezone.utc)


# ---------------------------------------------------------------------------
# Valid status transitions — enforced on every manual status change
# ---------------------------------------------------------------------------
_VALID_TRANSITIONS: dict[ElectionStatus, list[ElectionStatus]] = {
    ElectionStatus.DRAFT:              [ElectionStatus.NOMINATION_OPEN],
    ElectionStatus.NOMINATION_OPEN:    [ElectionStatus.VOTING_OPEN, ElectionStatus.DRAFT],
    ElectionStatus.VOTING_OPEN:        [ElectionStatus.CLOSED],
    ElectionStatus.CLOSED:             [ElectionStatus.RESULTS_PUBLISHED],
    ElectionStatus.RESULTS_PUBLISHED:  [],
}


# ---------------------------------------------------------------------------
# Queries
# ---------------------------------------------------------------------------

def get_election(db: Session, election_id: int) -> Optional[Election]:
    return db.query(Election).filter(Election.id == election_id).first()


def get_elections(db: Session) -> List[Election]:
    return db.query(Election).order_by(Election.created_at.desc()).all()


def get_active_elections(db: Session) -> List[Election]:
    """Returns elections that students can currently interact with."""
    return (
        db.query(Election)
        .filter(Election.status.in_([
            ElectionStatus.NOMINATION_OPEN,
            ElectionStatus.VOTING_OPEN,
        ]))
        .order_by(Election.voting_start)
        .all()
    )


# ---------------------------------------------------------------------------
# Create
# ---------------------------------------------------------------------------

def create_election(db: Session, data: ElectionIn, admin_id: int) -> Election:
    election = Election(
        name=data.name,
        description=data.description,
        nomination_start=data.nomination_start,
        nomination_end=data.nomination_end,
        voting_start=data.voting_start,
        voting_end=data.voting_end,
        created_by=admin_id,
    )
    db.add(election)
    db.flush()  # get election.id before adding positions

    for pos in data.positions:
        db.add(Position(
            election_id=election.id,
            name=pos.name,
            description=pos.description,
            max_votes=pos.max_votes,
        ))

    _audit(db, "ELECTION_CREATED", admin_id,
           election_id=election.id,
           details=f"Created election: {data.name}")
    db.commit()
    db.refresh(election)
    return election


# ---------------------------------------------------------------------------
# Status management
# ---------------------------------------------------------------------------

def update_election_status(
    db: Session,
    election_id: int,
    new_status: ElectionStatus,
    admin_id: int,
    ip: Optional[str] = None,
) -> Election:
    election = get_election(db, election_id)
    if not election:
        raise ValueError("Election not found")

    old_status = election.status
    allowed = _VALID_TRANSITIONS.get(old_status, [])
    if new_status not in allowed:
        raise ValueError(
            f"Cannot move election from '{old_status}' to '{new_status}'. "
            f"Allowed transitions: {[s.value for s in allowed] or 'none'}"
        )

    election.status = new_status

    if new_status == ElectionStatus.RESULTS_PUBLISHED:
        election.results_published_at = _now()

    _audit(db, "ELECTION_STATUS_CHANGED", admin_id,
           election_id=election_id,
           details=f"Status changed: {old_status} → {new_status}",
           ip=ip)

    # Notify all verified students when voting opens or results are published
    if new_status in (ElectionStatus.VOTING_OPEN, ElectionStatus.RESULTS_PUBLISHED):
        students = (
            db.query(User)
            .filter(
                User.is_verified == True,
                User.is_active == True,
                User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
            )
            .all()
        )
        if new_status == ElectionStatus.VOTING_OPEN:
            title = "Voting Has Started! 🗳️"
            msg   = f"Voting is now open for '{election.name}'. Cast your vote before it closes."
            ntype = "info"
        else:
            title = "Results Published! 🏆"
            msg   = f"Results for '{election.name}' have been published. Check the results page."
            ntype = "success"

        for s in students:
            _notify(db, s.id, title, msg, ntype, election_id=election_id)

    db.commit()
    db.refresh(election)
    return election


def lock_candidates(db: Session, election_id: int, admin_id: int) -> Election:
    election = get_election(db, election_id)
    if not election:
        raise ValueError("Election not found")
    if election.status != ElectionStatus.NOMINATION_OPEN:
        raise ValueError("Candidates can only be locked while nominations are open")

    election.candidates_locked = True
    _audit(db, "CANDIDATES_LOCKED", admin_id,
           election_id=election_id,
           details="Candidate list locked by admin")
    db.commit()
    db.refresh(election)
    return election



# ---------------------------------------------------------------------------
# Admin stats & audit
# ---------------------------------------------------------------------------

def get_admin_stats(db: Session) -> dict:
    return {
        "total_students":        db.query(User).filter(
                                     User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
                                     User.is_active == True,
                                 ).count(),
        "pending_verifications": db.query(User).filter(
                                     User.is_verified == False,
                                     User.is_active == True,
                                     User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
                                 ).count(),
        "verified_students":     db.query(User).filter(
                                     User.is_verified == True,
                                     User.is_active == True,
                                 ).count(),
        "total_elections":       db.query(Election).count(),
        "active_elections":      db.query(Election).filter(
                                     Election.status == ElectionStatus.VOTING_OPEN,
                                 ).count(),
        "pending_candidates":    db.query(Candidate).filter(
                                     Candidate.approval_status == ApprovalStatus.PENDING,
                                 ).count(),
        "total_votes_cast":      db.query(VoterParticipation).count(),
    }


def get_audit_logs(db: Session, skip: int = 0, limit: int = 100) -> List[AuditLog]:
    return (
        db.query(AuditLog)
        .order_by(AuditLog.timestamp.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


def get_election_audit_logs(db: Session, election_id: int) -> List[AuditLog]:
    return (
        db.query(AuditLog)
        .filter(AuditLog.election_id == election_id)
        .order_by(AuditLog.timestamp.desc())
        .all()
    )


def export_audit_csv(db: Session) -> str:
    """Returns audit logs as a CSV string."""
    logs = get_audit_logs(db, skip=0, limit=10_000)
    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Action", "User ID", "Election ID", "Details", "IP Address", "Timestamp"])
    for log in logs:
        writer.writerow([
            log.id, log.action, log.user_id,
            log.election_id, log.details,
            log.ip_address, log.timestamp,
        ])
    return output.getvalue()
