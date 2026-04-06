<<<<<<< HEAD
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
=======
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ElectionStatus, User
from app.schemas.schemas import ElectionOut, ElectionResults
from app.services.election_service import get_election, update_election_status
from app.services.result_service import get_election_results
from app.utils.dependencies import require_admin


router = APIRouter(prefix="/api", tags=["Voting"])

@router.post(
    "/api/admin/elections/{election_id}/publish-results",
    response_model=ElectionOut,
    summary="Publish election results (transitions status to RESULTS_PUBLISHED)",
)
async def admin_publish_results(
    election_id: int,
    request: Request,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Election not found")
    try:
        return update_election_status(
            db, election_id, ElectionStatus.RESULTS_PUBLISHED, admin.id, request.client.host
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.get(
    "/api/admin/elections/{election_id}/results",
    response_model=ElectionResults,
    summary="Admin view of results (available once CLOSED, before publishing)",
)
async def admin_get_results(
    election_id: int,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Election not found")
    if election.status not in (ElectionStatus.CLOSED, ElectionStatus.RESULTS_PUBLISHED):
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="Election must be closed or results published to view results",
        )
    try:
        return get_election_results(db, election_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))

"/api/admin/audit-logs"
"/api/admin/audit-logs/export"
>>>>>>> 3faff590b97884904aebe3f59a9e36eff71af618
