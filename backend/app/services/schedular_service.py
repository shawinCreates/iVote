from __future__ import annotations
from datetime import datetime, timezone
from sqlalchemy.orm import Session

from apscheduler.schedulers.background import BackgroundScheduler

from app.core.crypto import fingerprint, generate_keypair, priv_to_json, pub_to_json
from app.db.database import SessionLocal
from app.db.models import Election, ElectionStatus, User, UserRole
from app.services.audit_notification_service import _audit, _notify
from app.services.he_tally_service import _run_he_tally

def open_nominations(db: Session, election: Election) -> None:
    election.status = ElectionStatus.NOMINATION_OPEN
    _audit(db, "ELECTION_STATUS_CHANGED", None, election_id=election.id,
           details="[SYSTEM] DRAFT → NOMINATION_OPEN")
    db.commit()

def open_voting(db: Session, election: Election) -> None:
    pk, sk = generate_keypair()
    election.he_public_key_json  = pub_to_json(pk)
    election.he_private_key_json = priv_to_json(sk)
    election.he_key_fingerprint  = fingerprint(pk)   
    election.candidates_locked   = True
    election.status              = ElectionStatus.VOTING_OPEN
    _audit(db, "ELECTION_STATUS_CHANGED", None, election_id=election.id,
           details="[SYSTEM] NOMINATION_OPEN → VOTING_OPEN; HE keys generated; candidates locked")
    _audit(db, "HE_KEYS_GENERATED", None, election_id=election.id,
           details=f"Paillier 2048-bit keys auto-generated. Fingerprint: {election.he_key_fingerprint[:16]}…")
    
    try:
        students = (db.query(User)
                    .filter(User.is_verified == True, User.is_active == True,
                            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]))
                    .all())
        for s in students:
            _notify(db, s.id, f"Voting is Open — {election.name}",
                    f"Voting has started for '{election.name}'. Cast your vote before it closes!",
                    "info", election_id=election.id)
    except Exception as notify_err:
        print(f"[WARN] Notification send failed during open_voting: {notify_err}")
    db.commit()

def close_voting_and_tally(db: Session, election: Election) -> None:
    election.status = ElectionStatus.CLOSED
    _audit(db, "ELECTION_STATUS_CHANGED", None, election_id=election.id,
           details="[SYSTEM] VOTING_OPEN → CLOSED; running HE tally")
    db.commit()

    try:
        _run_he_tally(db, election)
    except Exception as tally_err:
        _audit(db, "HE_TALLY_ERROR", None, election_id=election.id,
               details=f"Tally failed: {tally_err}")
        db.commit()

def _tick() -> None:
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        elections = (db.query(Election)
                     .filter(Election.status.in_([
                         ElectionStatus.DRAFT,
                         ElectionStatus.NOMINATION_OPEN,
                         ElectionStatus.VOTING_OPEN,
                     ]))
                     .all())
        for e in elections:
            changed = True
            while changed:
                changed = False
                if e.status == ElectionStatus.DRAFT and e.nomination_start <= now:
                    open_nominations(db, e)
                    # Reload from DB so status is current for next iteration
                    db.refresh(e)
                    changed = True
                elif e.status == ElectionStatus.NOMINATION_OPEN and e.voting_start <= now:
                    open_voting(db, e)
                    db.refresh(e)
                    changed = True
                elif e.status == ElectionStatus.VOTING_OPEN and e.voting_end <= now:
                    close_voting_and_tally(db, e)
                    db.refresh(e)
                    changed = True   # no further transition possible after CLOSED

    except Exception as err:
        db.rollback()
        print(f"[Scheduler] Error: {err}")
    finally:
        db.close()


def start() -> BackgroundScheduler:
    scheduler = BackgroundScheduler()
    scheduler.add_job(
        _tick, "interval", seconds=60, id="election_tick",
        max_instances=1, coalesce=True,
    )
    scheduler.start()
    _tick()
    return scheduler
