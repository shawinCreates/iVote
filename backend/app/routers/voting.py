from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import List

from app.core.crypto import ballot_to_json, encrypt_ballot, pub_from_json
from app.db.database import get_db
from app.db.models import ApprovalStatus, Candidate, User
from app.schemas.schemas import EncBallotIn, HEBallotIn, HasVotedOut, VoteConfirmation
from app.services import voting_service
from app.services.election_service import get_election
from app.utils.dependencies import require_verified

router = APIRouter(prefix="/api", tags=["Voting"])


class PlainPositionVote(BaseModel):
    position_id: int
    candidate_ids: List[int]


class PlainVoteIn(BaseModel):
    election_id: int
    positions: List[PlainPositionVote]


@router.post("/vote/plain", response_model=VoteConfirmation)
async def cast_plain_vote(
    body: PlainVoteIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    election = get_election(db, body.election_id)
    if not election or not election.he_public_key_json:
        raise HTTPException(status_code=400, detail="Election not ready for voting")

    pk = pub_from_json(election.he_public_key_json)

    he_positions = []
    for pos_body in body.positions:
        position = next((p for p in election.positions if p.id == pos_body.position_id), None)
        if not position:
            raise HTTPException(status_code=400, detail=f"Position {pos_body.position_id} not found")

        approved = (
            db.query(Candidate)
            .filter(
                Candidate.position_id == pos_body.position_id,
                Candidate.approval_status == ApprovalStatus.APPROVED,
            )
            .order_by(Candidate.id)
            .all()
        )
        approved_ids = [c.id for c in approved]

        selected_indices = []
        for cid in pos_body.candidate_ids:
            if cid in approved_ids:
                selected_indices.append(approved_ids.index(cid))

        encrypted = encrypt_ballot(pk, selected_indices, len(approved_ids))
        he_positions.append({
            "position_id": pos_body.position_id,
            "candidate_ids": pos_body.candidate_ids,
            "encrypted_ballot_json": ballot_to_json(encrypted),
        })

    he_ballot = HEBallotIn(
        election_id=body.election_id,
        positions=[EncBallotIn(**p) for p in he_positions],
    )
    return voting_service.cast_he_ballot(db, user.id, he_ballot, ip=request.client.host)

@router.post("/vote", response_model=VoteConfirmation)
async def cast_vote(
    ballot: HEBallotIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified)
):
    try:
        return voting_service.cast_he_ballot(db, user.id, ballot, ip=request.client.host)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/elections/{election_id}/has-voted", response_model=HasVotedOut)
async def check_voted(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified)
):
    vparticipation = voting_service.get_participation(db, user.id, election_id)
    if vparticipation:
        return HasVotedOut(
            has_voted=True,
            confirmation_code=vparticipation.confirmation_code,
            voted_at=vparticipation.voted_at
        )
    return HasVotedOut(has_voted=False)
