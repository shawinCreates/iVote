from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import HEBallotIn, HasVotedOut, VoteConfirmation
from app.utils.dependencies import require_verified

from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import HEBallotIn, VoteConfirmation, HasVotedOut
from app.services import voting_service

router = APIRouter(prefix="/api", tags=["Voting"])

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
