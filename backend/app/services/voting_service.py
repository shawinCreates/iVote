from typing import Optional
import uuid

from sqlalchemy.orm import Session

<<<<<<< HEAD
from app.core import crypto as he
from app.core.crypto import pub_from_json
=======
from app.core.crypto import ballot_from_json, pub_from_json
>>>>>>> 3faff590b97884904aebe3f59a9e36eff71af618
from app.db.models import ApprovalStatus, Candidate, ElectionStatus, EncryptedVote, VoterParticipation
from app.schemas.schemas import HEBallotIn, VoteConfirmation
from app.services.audit_notification_service import _audit
from app.services.election_service import get_election

def has_voted(db: Session, user_id: int, election_id: int) -> bool:
    return (db.query(VoterParticipation)
            .filter(VoterParticipation.voter_id == user_id,
                    VoterParticipation.election_id == election_id)
            .first() is not None)

def get_participation(db: Session, user_id: int,
                      election_id: int) -> Optional[VoterParticipation]:
    return (db.query(VoterParticipation)
            .filter(VoterParticipation.voter_id == user_id,
                    VoterParticipation.election_id == election_id)
            .first())

def cast_he_ballot(db: Session, user_id: int,
                   ballot: HEBallotIn,
                   ip: str = None) -> VoteConfirmation:

    election = get_election(db, ballot.election_id)
    if not election or election.status != ElectionStatus.VOTING_OPEN:
        raise ValueError("This election is not currently open for voting")

    if not election.he_public_key_json:
        raise ValueError("Election encryption keys are not ready. Please try again shortly.")
    pk = pub_from_json(election.he_public_key_json)

    positions_with_candidates = {}
    for pos in election.positions:
        approved = (db.query(Candidate)
                    .filter(Candidate.position_id == pos.id,
                            Candidate.approval_status == ApprovalStatus.APPROVED)
                    .all())
        if approved:
            positions_with_candidates[pos.id] = {
                "pos": pos,
                "approved_ids": {c.id for c in approved},
                "approved_count": len(approved),
            }

    submitted_position_ids = {pb.position_id for pb in ballot.positions}

    for pid in positions_with_candidates:
        if pid not in submitted_position_ids:
            pos_name = positions_with_candidates[pid]["pos"].name
            raise ValueError(
                f"Your ballot is missing position '{pos_name}'. "
                "You must include all positions (you may leave them with no selection on the front end, "
                "but the server requires every position to be submitted)."
            )

    for pos_ballot in ballot.positions:
        if pos_ballot.position_id not in positions_with_candidates:
            raise ValueError(f"Position {pos_ballot.position_id} does not belong to this election "
                             "or has no approved candidates")

        info = positions_with_candidates[pos_ballot.position_id]
        pos  = info["pos"]
        approved_ids = info["approved_ids"]

        for cid in pos_ballot.candidate_ids:
            if cid not in approved_ids:
                raise ValueError(f"Candidate {cid} is not approved for this position")

        if len(pos_ballot.candidate_ids) > pos.max_votes:
            raise ValueError(
                f"Position '{pos.name}' allows max {pos.max_votes} selection(s), "
                f"but {len(pos_ballot.candidate_ids)} were submitted"
            )

        try:
            enc = ballot_from_json(pos_ballot.encrypted_ballot_json, pk)
        except Exception as enc_err:
            raise ValueError(f"Malformed encrypted ballot for position '{pos.name}': {enc_err}")
        if len(enc) != info["approved_count"]:
            raise ValueError(
                f"Encrypted ballot length mismatch for '{pos.name}': "
                f"expected {info['approved_count']}, got {len(enc)}"
            )

    try:
        existing = (db.query(VoterParticipation)
                    .filter(VoterParticipation.voter_id == user_id,
                            VoterParticipation.election_id == ballot.election_id)
                    .with_for_update()
                    .first())
        if existing:
            raise ValueError("You have already voted in this election")

        code = f"VT-{uuid.uuid4().hex[:8].upper()}"
        participation = VoterParticipation(
            voter_id=user_id,
            election_id=ballot.election_id,
            confirmation_code=code,
        )
        db.add(participation)
        db.flush()   # get participation.id; unique constraint catches any concurrent insert

        for pos_ballot in ballot.positions:
            if pos_ballot.position_id not in positions_with_candidates:
                continue
            approved_ids_ordered = [
                c.id for c in db.query(Candidate)
                .filter(Candidate.position_id == pos_ballot.position_id,
                        Candidate.approval_status == ApprovalStatus.APPROVED)
                .order_by(Candidate.id)
                .all()
            ]
            db.add(EncryptedVote(
                election_id=ballot.election_id,
                position_id=pos_ballot.position_id,
                participation_id=participation.id,
                encrypted_ballot_json=pos_ballot.encrypted_ballot_json,
            ))

        _audit(db, "HE_VOTE_CAST", user_id, election_id=ballot.election_id,
               details=f"Encrypted ballot submitted. Code: {code}", ip=ip)
        db.commit()

        return VoteConfirmation(
            confirmation_code=code,
            voted_at=participation.voted_at,
            message="Your encrypted vote has been recorded and cannot be changed.",
        )
    except ValueError:
        db.rollback()
        raise
    except Exception:
        db.rollback()
        raise
