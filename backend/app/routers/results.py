from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import User, ElectionStatus
from app.schemas.schemas import ElectionResults
from app.services.auth_services import require_verified
from app.services.election_service import get_election, get_election_results

router = APIRouter(prefix="/api/results", tags=["Results"])

@router.get("/{election_id}", response_model=ElectionResults)
async def fetch_results(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified)
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status_code=404, detail="Election not found")
    
    if election.status != ElectionStatus.RESULTS_PUBLISHED:
        raise HTTPException(status_code=403, detail="Results have not been published yet.")
        
    try:
        return get_election_results(db, election_id)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))