from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from backend.app.db.database import get_db
from backend.app.db.models import ElectionStatus, User, UserRole
from backend.app.schemas.schemas import ElectionResults, HEBallotIn, HasVotedOut, VoteConfirmation
from backend.app.services.auth_services import require_verified
from backend.app.services.voting_service import cast_he_ballot, get_participation

router = APIRouter(prefix="/api", tags=["Voting"])

@router.post("/vote", response_model=VoteConfirmation)
async def cast_vote(
    ballot: HEBallotIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User  = Depends(require_verified),
):
    if user.role == UserRole.ELECTION_HEAD:
        raise HTTPException(403, detail="Admin cannot vote")
    try:
        return cast_he_ballot(db, user.id, ballot, request.client.host)
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

@router.get("/elections/{election_id}/has-voted",
            response_model=HasVotedOut)
async def has_voted(
    election_id: int,
    db: Session = Depends(get_db),
    user: User  = Depends(require_verified),
):
    p = get_participation(db, user.id, election_id)
    if p:
        return HasVotedOut(
            has_voted=True,
            confirmation_code=p.confirmation_code,
            voted_at=p.voted_at,
        )
    return HasVotedOut(has_voted=False)


@router.get("/elections/{election_id}/results",
            response_model=ElectionResults)
async def student_results(
    election_id: int,
    db: Session = Depends(get_db),
    user: User  = Depends(require_verified),
):
    e = get_election(db, election_id)
    if not e:
        raise HTTPException(404, detail="Election not found")
    if e.status != ElectionStatus.RESULTS_PUBLISHED:
        raise HTTPException(403, detail="Results have not been published yet")
    try:
        return get_results(db, election_id)
    except ValueError as ex:
        raise HTTPException(400, detail=str(ex))
