from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app import schemas, crud
from app.db import get_db
from app.db.models import User
from app.dependencies import require_admin
from iVote.backend.app import services

router = APIRouter(tags=["Candidates"])
# Student-facing
#"/api/positions/{position_id}/candidates"
#"/api/candidates/apply"
#"/api/candidates/{candidate_id}/view"

# Admin-facing
#"/api/admin/candidates"
#"/api/admin/candidates/pending"
#"/api/admin/candidates/{candidate_id}/approve"
#"/api/admin/candidates/{candidate_id}/reject"


## Candidate management endpoints


@router.get("/candidates/pending", response_model=List[schemas.CandidateOut])
async def pending_candidates(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return services.get_pending_candidates(db, election_id)

@router.get("/candidates/all", response_model=List[schemas.CandidateOut])
async def all_candidates(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return services.get_all_candidates(db, election_id)

@router.post("/candidates/{candidate_id}/approve",
             response_model=schemas.CandidateOut)
async def approve_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        return services.approve_candidate(db, candidate_id, admin.id)
    except ValueError as err:
        raise HTTPException(400, detail=str(err))

@router.post("/candidates/{candidate_id}/reject",
             response_model=schemas.CandidateOut)
async def reject_candidate(
    candidate_id: int,
    body: schemas.RejectReasonIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        return services.reject_candidate(db, candidate_id, admin.id, body.reason)
    except ValueError as err:
        raise HTTPException(400, detail=str(err))