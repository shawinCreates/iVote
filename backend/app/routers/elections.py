from __future__ import annotations
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import ElectionStatus, User
from app.schemas.schemas import ElectionIn, ElectionOut, ElectionResults
from app.services.auth_services import require_admin, require_verified
from app.services.election_service import (
    create_election,
    export_audit_csv,
    get_admin_stats,
    get_audit_logs,
    get_election,
    get_election_audit_logs,
    get_elections,
    get_active_elections,
    lock_candidates,
    update_election_status,
)
from app.services.result_service import get_election_results

router = APIRouter(tags=["Elections"])


# ===========================================================================
# Student-facing endpoints
# ===========================================================================

@router.get(
    "/api/elections",
    response_model=List[ElectionOut],
    summary="List all elections (student view)",
)
async def list_elections(
    db: Session = Depends(get_db),
    user: User  = Depends(require_verified),
):
    return get_elections(db)


@router.get(
    "/api/elections/active",
    response_model=List[ElectionOut],
    summary="List elections currently open for nomination or voting",
)
async def list_active_elections(
    db: Session  = Depends(get_db),
    user: User   = Depends(require_verified),
):
    return get_active_elections(db)


@router.get(
    "/api/elections/{election_id}",
    response_model=ElectionOut,
    summary="Get a single election by ID",
)
async def get_election_detail(
    election_id: int,
    db: Session  = Depends(get_db),
    user: User   = Depends(require_verified),
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Election not found")
    return election


@router.get(
    "/api/elections/{election_id}/he-public-key",
    summary="Get the HE public key for client-side ballot encryption",
)
async def get_he_public_key(
    election_id: int,
    db: Session  = Depends(get_db),
    user: User   = Depends(require_verified),
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Election not found")
    if not election.he_public_key_json:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="No public key has been generated for this election yet",
        )
    return {
        "election_id":    election.id,
        "public_key_json": election.he_public_key_json,
        "fingerprint":    election.he_key_fingerprint,
    }


@router.get(
    "/api/elections/{election_id}/results",
    response_model=ElectionResults,
    summary="View published results for an election",
)
async def get_results(
    election_id: int,
    db: Session  = Depends(get_db),
    user: User   = Depends(require_verified),
):
    election = get_election(db, election_id)
    if not election:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Election not found")
    if election.status != ElectionStatus.RESULTS_PUBLISHED:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Results have not been published yet",
        )
    try:
        return get_election_results(db, election_id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


# ===========================================================================
# Admin-facing endpoints
# ===========================================================================

@router.get(
    "/api/admin/stats",
    summary="Dashboard statistics for the admin panel",
)
async def admin_stats(
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    return get_admin_stats(db)


@router.get(
    "/api/admin/elections",
    response_model=List[ElectionOut],
    summary="List all elections (admin view, no status filter)",
)
async def admin_list_elections(
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    return get_elections(db)


@router.post(
    "/api/admin/elections",
    response_model=ElectionOut,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new election with positions",
)
async def admin_create_election(
    data: ElectionIn,
    db: Session   = Depends(get_db),
    admin: User   = Depends(require_admin),
):
    return create_election(db, data, admin.id)


@router.put(
    "/api/admin/elections/{election_id}/status",
    response_model=ElectionOut,
    summary="Manually advance or revert an election's status",
)
async def admin_update_status(
    election_id: int,
    body: _StatusBody,
    request: Request,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    try:
        return update_election_status(
            db, election_id, body.status, admin.id, request.client.host
        )
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.post(
    "/api/admin/elections/{election_id}/lock-candidates",
    response_model=ElectionOut,
    summary="Lock the candidate list so no new applications can be made",
)
async def admin_lock_candidates(
    election_id: int,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    try:
        return lock_candidates(db, election_id, admin.id)
    except ValueError as e:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(e))




# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------

@router.get(
    "/api/admin/audit-logs",
    summary="Paginated audit log for all actions",
)
async def admin_audit_logs(
    skip: int    = 0,
    limit: int   = 100,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    return get_audit_logs(db, skip=skip, limit=limit)


@router.get(
    "/api/admin/elections/{election_id}/audit-logs",
    summary="Audit log filtered to a specific election",
)
async def admin_election_audit_logs(
    election_id: int,
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    return get_election_audit_logs(db, election_id)


@router.get(
    "/api/admin/audit-logs/export",
    summary="Download all audit logs as a CSV file",
)
async def admin_export_audit_csv(
    db: Session  = Depends(get_db),
    admin: User  = Depends(require_admin),
):
    csv_data = export_audit_csv(db)
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=audit_logs.csv"},
    )


# ===========================================================================
# Internal schema for status update body
# (defined here so it doesn't pollute the shared schemas file)
# ===========================================================================

from pydantic import BaseModel  # noqa: E402  (kept local on purpose)


class _StatusBody(BaseModel):
    status: ElectionStatus
