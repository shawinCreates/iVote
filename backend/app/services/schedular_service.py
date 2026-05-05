from __future__ import annotations
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.db.database import SessionLocal
from app.db.models import Election, ElectionStatus, Notification, User, UserRole
from app.services.audit_notification_service import _audit, _notify
from app.core.crypto import generate_keypair, pub_to_json, priv_to_json, fingerprint


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _make_aware(dt):
    if dt is None:
        return None
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _notify_all_students(db: Session, title: str, message: str,
                          ntype: str = "info", election_id: int = None):
    students = (db.query(User)
                .filter(User.is_verified == True, User.is_active == True,
                        User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]))
                .all())
    for s in students:
        _notify(db, s.id, title, message, ntype, election_id)


def tick():
    """Main tick function — called every 60 seconds by APScheduler."""
    db: Session = SessionLocal()
    now = _now()
    try:
        elections = db.query(Election).all()
        for el in elections:
            nom_start  = _make_aware(el.nomination_start)
            nom_end    = _make_aware(el.nomination_end)
            vote_start = _make_aware(el.voting_start)
            vote_end   = _make_aware(el.voting_end)

            # DRAFT → NOMINATION_OPEN
            if el.status == ElectionStatus.DRAFT and nom_start and now >= nom_start:
                el.status = ElectionStatus.NOMINATION_OPEN
                _audit(db, "ELECTION_STATUS_CHANGED", None, actor_role="system",
                       election_id=el.id,
                       details=f"'{el.name}' → NOMINATION_OPEN")
                _notify_all_students(db, f"Nominations Open — {el.name}",
                                     f"Nominations are now open for '{el.name}'. "
                                     f"Apply for candidacy before {nom_end.strftime('%d %b %Y %H:%M')}.",
                                     "info", el.id)

            # Lock candidates when nomination closes
            if (el.status == ElectionStatus.NOMINATION_OPEN
                    and nom_end and now >= nom_end
                    and not el.candidates_locked):
                el.candidates_locked = True
                _audit(db, "CANDIDATES_LOCKED", None, actor_role="system",
                       election_id=el.id,
                       details=f"Candidate list locked automatically at nomination close for '{el.name}'")

            # NOMINATION_OPEN → VOTING_OPEN: generate HE keys
            if el.status == ElectionStatus.NOMINATION_OPEN and vote_start and now >= vote_start:
                try:
                    pk, sk = generate_keypair(n_bits=2048)
                    el.he_public_key_json   = pub_to_json(pk)
                    el.he_private_key_json  = priv_to_json(sk)
                    el.he_key_fingerprint   = fingerprint(pk)
                except Exception as ke:
                    _audit(db, "HE_KEY_GEN_FAILED", None, actor_role="system",
                           election_id=el.id, details=str(ke))
                el.status = ElectionStatus.VOTING_OPEN
                _audit(db, "ELECTION_STATUS_CHANGED", None, actor_role="system",
                       election_id=el.id,
                       details=f"'{el.name}' → VOTING_OPEN · HE keys generated · fingerprint={el.he_key_fingerprint}")
                _notify_all_students(db, f"Voting is Now Open — {el.name}",
                                     f"Voting has started for '{el.name}'. "
                                     f"Cast your vote before {vote_end.strftime('%d %b %Y %H:%M')}.",
                                     "info", el.id)

            # VOTING_OPEN → CLOSED
            if el.status == ElectionStatus.VOTING_OPEN and vote_end and now >= vote_end:
                el.status = ElectionStatus.CLOSED
                _audit(db, "ELECTION_STATUS_CHANGED", None, actor_role="system",
                       election_id=el.id,
                       details=f"'{el.name}' → CLOSED · ready for tally")
                _notify_all_students(db, f"Voting Closed — {el.name}",
                                     f"Voting for '{el.name}' has ended. "
                                     f"Results will be published soon.",
                                     "info", el.id)

        db.commit()
    except Exception as exc:
        db.rollback()
        print(f"[Scheduler] Error: {exc}")
    finally:
        db.close()


def start():
    scheduler = BackgroundScheduler(timezone="UTC")
    scheduler.add_job(tick, "interval", seconds=1, id="election_tick",
                      replace_existing=True)
    scheduler.start()
    print("[Scheduler] Election lifecycle scheduler started.")
