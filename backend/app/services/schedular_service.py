from __future__ import annotations

from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Optional

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy.orm import Session

from app.core.crypto import (
    fingerprint,
    generate_keypair,
    priv_to_json,
    pub_to_json,
)
from app.db.database import SessionLocal
from app.db.models import (
    Election,
    ElectionStatus,
    User,
    UserRole,
    VoterParticipation,
)
from app.services.audit_notification_service import _audit, _notify
from app.services.he_tally_service import _run_he_tally


# =========================================================
# CONFIG
# =========================================================

TICK_INTERVAL_SECONDS = 60

# Separate executor for expensive HE tally operations
_tally_executor = ThreadPoolExecutor(
    max_workers=2,
    thread_name_prefix="he_tally",
)


# =========================================================
# TIME HELPERS
# =========================================================

def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def ensure_utc(dt: Optional[datetime]) -> Optional[datetime]:
    """
    Ensures datetime is timezone-aware UTC.
    """
    if dt is None:
        return None

    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)

    return dt.astimezone(timezone.utc)


# =========================================================
# NOTIFICATION HELPERS
# =========================================================

def notify_students(
    db: Session,
    title: str,
    message: str,
    notification_type: str = "info",
    election_id: Optional[int] = None,
) -> None:
    """
    Notify all eligible student voters.
    """
    students = (
        db.query(User)
        .filter(
            User.is_verified.is_(True),
            User.is_active.is_(True),
            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
        )
        .all()
    )

    for student in students:
        try:
            _notify(
                db,
                student.id,
                title,
                message,
                notification_type,
                election_id=election_id,
            )
        except Exception as err:
            print(f"[Notify Error] user={student.id}: {err}")


# =========================================================
# AUDIT HELPERS
# =========================================================

def audit_status_change(
    db: Session,
    election: Election,
    from_status: str,
    to_status: str,
    details: str = "",
) -> None:
    _audit(
        db,
        "ELECTION_STATUS_CHANGED",
        None,
        actor_role="system",
        election_id=election.id,
        details=f"{from_status} → {to_status}. {details}",
    )


# =========================================================
# STATE TRANSITIONS
# =========================================================

def transition_to_nomination_open(db: Session, election: Election) -> None:
    previous = election.status

    election.status = ElectionStatus.NOMINATION_OPEN

    audit_status_change(
        db,
        election,
        previous,
        ElectionStatus.NOMINATION_OPEN,
        "Nominations opened automatically.",
    )

    db.commit()

    notify_students(
        db,
        f"Nominations Open — {election.name}",
        (
            f"Nominations are now open for '{election.name}'. "
            f"Apply before nominations close."
        ),
        election_id=election.id,
    )

    db.commit()


def transition_to_nomination_closed(db: Session, election: Election) -> None:
    previous = election.status

    election.status = ElectionStatus.NOMINATION_CLOSED
    election.candidates_locked = True

    audit_status_change(
        db,
        election,
        previous,
        ElectionStatus.NOMINATION_CLOSED,
        "Candidate list locked.",
    )

    db.commit()

    notify_students(
        db,
        f"Nominations Closed — {election.name}",
        (
            f"Nominations for '{election.name}' are now closed. "
            f"Voting will begin soon."
        ),
        election_id=election.id,
    )

    db.commit()


def transition_to_voting_open(db: Session, election: Election) -> None:
    previous = election.status

    # Snapshot eligible voters
    election.eligible_voters = (
        db.query(User)
        .filter(
            User.is_verified.is_(True),
            User.is_active.is_(True),
            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
        )
        .count()
    )

    # Generate HE keys
    pk, sk = generate_keypair(n_bits=2048)

    election.he_public_key_json = pub_to_json(pk)
    election.he_private_key_json = priv_to_json(sk)
    election.he_key_fingerprint = fingerprint(pk)

    election.status = ElectionStatus.VOTING_OPEN

    audit_status_change(
        db,
        election,
        previous,
        ElectionStatus.VOTING_OPEN,
        (
            "Voting opened. "
            f"HE keys generated. "
            f"Fingerprint={election.he_key_fingerprint[:16]}..."
        ),
    )

    _audit(
        db,
        "HE_KEYS_GENERATED",
        None,
        actor_role="system",
        election_id=election.id,
        details=(
            f"Paillier 2048-bit keys generated. "
            f"Fingerprint={election.he_key_fingerprint}"
        ),
    )

    db.commit()

    notify_students(
        db,
        f"Voting is Open — {election.name}",
        (
            f"Voting has started for '{election.name}'. "
            f"Please cast your vote before voting closes."
        ),
        election_id=election.id,
    )

    db.commit()


def transition_to_closed(db: Session, election: Election) -> None:
    previous = election.status

    # Snapshot turnout
    election.turnout_voters = (
        db.query(VoterParticipation)
        .filter(VoterParticipation.election_id == election.id)
        .count()
    )

    election.status = ElectionStatus.CLOSED

    audit_status_change(
        db,
        election,
        previous,
        ElectionStatus.CLOSED,
        "Voting closed. HE tally queued.",
    )

    db.commit()

    notify_students(
        db,
        f"Voting Closed — {election.name}",
        (
            f"Voting for '{election.name}' has ended. "
            f"Results will be published soon."
        ),
        election_id=election.id,
    )

    db.commit()

    # Run tally asynchronously
    _tally_executor.submit(run_tally_job, election.id)


# =========================================================
# TALLY JOB
# =========================================================

def run_tally_job(election_id: int) -> None:
    """
    Runs HE tally in isolated DB session/thread.
    """
    db = SessionLocal()

    try:
        election = (
            db.query(Election)
            .filter(Election.id == election_id)
            .with_for_update()
            .first()
        )

        if not election or election.he_tally_completed:
            return

        _run_he_tally(db, election)

    except Exception as err:
        db.rollback()

        try:
            msg = str(err).split("[SQL:")[0].strip()
            if len(msg) > 300:
                msg = msg[:300] + "…"
            _audit(
                db,
                "HE_TALLY_FAILED",
                None,
                actor_role="system",
                election_id=election_id,
                details=msg,
            )
            db.commit()
        except Exception:
            pass

        print(f"[HE TALLY ERROR] election={election_id}: {err}")

    finally:
        db.close()


# =========================================================
# MAIN TICK
# =========================================================

def tick() -> None:
    """
    Main election lifecycle scheduler tick.
    """
    db = SessionLocal()

    try:
        now = utc_now()

        # Only active elections
        elections = (
            db.query(Election)
            .filter(
                Election.status.in_(
                    [
                        ElectionStatus.DRAFT,
                        ElectionStatus.NOMINATION_OPEN,
                        ElectionStatus.NOMINATION_CLOSED,
                        ElectionStatus.VOTING_OPEN,
                        ElectionStatus.CLOSED,
                    ]
                )
            )
            .all()
        )

        for election in elections:

            # Normalize timestamps
            nomination_start = ensure_utc(election.nomination_start)
            nomination_end = ensure_utc(election.nomination_end)
            voting_start = ensure_utc(election.voting_start)
            voting_end = ensure_utc(election.voting_end)

            # Catch-up transitions
            for _ in range(4):

                changed = False

                # -----------------------------------------
                # DRAFT → NOMINATION_OPEN
                # -----------------------------------------
                if (
                    election.status == ElectionStatus.DRAFT
                    and nomination_start
                    and now >= nomination_start
                ):
                    transition_to_nomination_open(db, election)
                    db.refresh(election)
                    changed = True

                # -----------------------------------------
                # NOMINATION_OPEN → NOMINATION_CLOSED
                # -----------------------------------------
                elif (
                    election.status == ElectionStatus.NOMINATION_OPEN
                    and nomination_end
                    and now >= nomination_end
                ):
                    transition_to_nomination_closed(db, election)
                    db.refresh(election)
                    changed = True

                # -----------------------------------------
                # NOMINATION_CLOSED → VOTING_OPEN
                # -----------------------------------------
                elif (
                    election.status == ElectionStatus.NOMINATION_CLOSED
                    and voting_start
                    and now >= voting_start
                ):
                    transition_to_voting_open(db, election)
                    db.refresh(election)
                    changed = True

                # -----------------------------------------
                # VOTING_OPEN → CLOSED
                # -----------------------------------------
                elif (
                    election.status == ElectionStatus.VOTING_OPEN
                    and voting_end
                    and now >= voting_end
                ):
                    transition_to_closed(db, election)
                    db.refresh(election)
                    changed = True
                
                # -----------------------------------------
                # CLOSED → RECOVER MISSED TALLY
                # -----------------------------------------
                elif (
                    election.status == ElectionStatus.CLOSED
                    and not election.he_tally_completed
                ):
                    print(
                        f"[Scheduler] Recovering missed tally "
                        f"for election {election.id}"
                    )
                    _tally_executor.submit(run_tally_job, election.id)
                    break
                if not changed:
                    break

    except Exception as err:
        db.rollback()
        print(f"[Scheduler Error] {err}")

    finally:
        db.close()


# =========================================================
# START SCHEDULER
# =========================================================

def start() -> BackgroundScheduler:
    """
    Starts APScheduler election lifecycle manager.
    """

    scheduler = BackgroundScheduler(timezone="UTC")

    scheduler.add_job(
        tick,
        trigger="interval",
        seconds=TICK_INTERVAL_SECONDS,
        id="election_lifecycle_tick",
        replace_existing=True,

        # IMPORTANT:
        max_instances=1,
        coalesce=True,
    )

    scheduler.start()

    print("[Scheduler] Election lifecycle scheduler started.")

    # Immediate startup catch-up
    tick()

    return scheduler
