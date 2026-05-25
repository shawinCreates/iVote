from app.db.models import( Candidate, Position, ApprovalStatus, ElectionStatus, UserRole)
from app.services.audit_notification_service import _audit, _notify
from app.services.election_service import get_election
from app.utils.helpers import _now

def get_pending_candidates(db, election_id = None):
    query = db.query(Candidate).filter(Candidate.approval_status == ApprovalStatus.PENDING)
    if election_id:
        query = query.join(Position).filter(Position.election_id == election_id)
    return query.order_by(Candidate.applied_at).all()

def get_all_candidates(db,
                       election_id = None):
    query = db.query(Candidate)
    if election_id:
        query = query.join(Position).filter(Position.election_id == election_id)
    return query.order_by(Candidate.applied_at).all()

def get_approved_candidates(db, position_id: int):
    return (db.query(Candidate)
            .filter(Candidate.position_id == position_id,
                    Candidate.approval_status == ApprovalStatus.APPROVED)
            .order_by(Candidate.id)
            .all())

def apply_candidacy(db, user_id, position_id, manifesto, 
                 photo_path):
    pos = db.query(Position).filter(Position.id == position_id).first()
    if not pos:
        raise ValueError("Position not found")
    e = get_election(db, pos.election_id)
    if not e or e.status != ElectionStatus.NOMINATION_OPEN:
        raise ValueError("Nominations are not currently open for this election")
    if e.candidates_locked:
        raise ValueError("The candidate list has been locked")

    existing_in_election = (
        db.query(Candidate)
        .join(Position, Candidate.position_id == Position.id)
        .filter(
            Candidate.user_id == user_id, Position.election_id == e.id,
        )
        .first()
    )
    if existing_in_election:
        raise ValueError(
            "You have already applied for a position in this election. "
            "Only one candidacy application per election is allowed."
        )

    c = Candidate(user_id=user_id, position_id=position_id,
                  manifesto=manifesto, photo_path=photo_path)
    db.add(c)
    _audit(db, "CANDIDACY_APPLIED", user_id,actor_role="student", election_id=e.id,
           details=f"Applied for position ID {position_id}")
    db.commit()
    db.refresh(c)
    return c

def approve_candidate(db, candidate_id, admin_id):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise ValueError("Candidate not found")
    c.approval_status = ApprovalStatus.APPROVED
    c.approved_at = _now()
    c.user.role = UserRole.CANDIDATE
    _audit(db, "CANDIDATE_APPROVED", admin_id,
           actor_role="admin", details=f"Approved candidate '{c.user.full_name}' for '{c.position.name}'")
    _notify(db, c.user_id, "Candidacy Approved!",
            f"Your application for '{c.position.name}' has been approved.",
            "success", election_id=c.position.election_id)
    db.commit()
    db.refresh(c)
    return c

def reject_candidate(db, candidate_id, admin_id, reason = None):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise ValueError("Candidate not found")
    c.approval_status = ApprovalStatus.REJECTED
    c.rejection_reason = reason or "Not approved by Election Head."
    _audit(db, "CANDIDATE_REJECTED", admin_id, actor_role="admin", 
           details=f"Rejected candidate ID {candidate_id}")
    _notify(db, c.user_id, "Candidacy Not Approved",
            f"Your application for '{c.position.name}' was not approved. {c.rejection_reason}",
            "warning", election_id=c.position.election_id)
    db.commit()
    db.refresh(c)
    return c

def increment_views(db, candidate_id):
    db.query(Candidate).filter(Candidate.id == candidate_id).update(
        {Candidate.profile_views: Candidate.profile_views + 1}
    )
    db.commit()