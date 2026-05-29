from fastapi import APIRouter, Depends, Request, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional

from app.db.database import get_db
from app.db.models import User, UserRole
from app.schemas.schemas import CandidateOut, RejectReasonIn
from app.services.candidate_service import apply_candidacy, approve_candidate, get_all_candidates, get_approved_candidates, get_candidate_by_id, get_my_candidacies, get_pending_candidates, increment_views, reject_candidate
from app.services.auth_services import get_user_profile_photo_path
from app.utils.dependencies import require_admin, require_verified
from app.core.config import _ALLOWED_PHOTO_TYPES, _EXT_MAP, _MAX_PHOTO_BYTES, CANDIDATE_PHOTO_DIR

student_router = APIRouter(prefix ="/api", tags=["Candidates"])
admin_router = APIRouter(prefix ="/api/admin", tags=["Candidates - Admin"])

# Student-facing
@student_router.get("/candidates/{candidate_id}/photo")
async def candidate_profile_photo(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    c = get_candidate_by_id(db, candidate_id)
    if not c:
        raise HTTPException(404, detail="Candidate not found")
    # Prefer campaign photo, fall back to registration profile photo
    if c.photo_path:
        from app.core.config import BASE_DIR
        campaign_path = BASE_DIR / c.photo_path
        if campaign_path.exists():
            return FileResponse(str(campaign_path))
    path = get_user_profile_photo_path(db, c.user_id)
    if not path:
        raise HTTPException(404, detail="Photo not found")
    return FileResponse(str(path))


@student_router.get("/positions/{position_id}/candidates", response_model=List[CandidateOut])
async def candidates_for_position(
    position_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    return get_approved_candidates(db, position_id)

@student_router.get("/candidates/{candidate_id}", response_model=CandidateOut)
async def get_candidate(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    c = get_candidate_by_id(db, candidate_id)
    if not c:
        raise HTTPException(404, detail="Candidate not found")
    increment_views(db, candidate_id)
    return c

@student_router.get("/my-candidacy", response_model=List[CandidateOut])
async def my_candidacy(
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    return get_my_candidacies(db, user.id)


@student_router.post("/candidates/apply", response_model=CandidateOut, status_code=201)
async def apply(
    position_id:int = Form(...),
    manifesto:str = Form(...),
    photo:UploadFile = File(...),
    db:Session = Depends(get_db),
    user:User  = Depends(require_verified),
):
    if user.role == UserRole.ELECTION_HEAD:
        raise HTTPException(403, detail="Admin cannot apply for candidacy")

    if len(manifesto.strip()) == 0:
        raise HTTPException(400, detail="Manifesto cannot be empty")
    if len(manifesto) > 5000:
        raise HTTPException(400, detail="Manifesto must be 5000 characters or fewer")

    if photo.content_type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, detail="Profile photo must be JPG or PNG")

    content = await photo.read()
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(400, detail="Profile photo must be smaller than 5 MB")

    ext  = _EXT_MAP[photo.content_type]
    dest = CANDIDATE_PHOTO_DIR / f"cand_{user.id}_{position_id}{ext}"
    with dest.open("wb") as f:
        f.write(content)

    relative = f"uploads/candidates_photo/cand_{user.id}_{position_id}{ext}"
    try:
        return apply_candidacy(
            db, user.id, position_id, manifesto, relative,
        )
    except ValueError as e:
        raise HTTPException(400, detail=str(e))

@admin_router.get("/candidates/pending", response_model=List[CandidateOut])
async def pending_candidates(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_pending_candidates(db, election_id)

@admin_router.get("/candidates/all", response_model=List[CandidateOut])
async def all_candidates(
    election_id: Optional[int] = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_all_candidates(db, election_id)

@admin_router.post("/candidates/{candidate_id}/approve", response_model=CandidateOut)
async def approve_candidate_endpoint(
    candidate_id: int,
    request = None,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        return approve_candidate(db, candidate_id, admin.id)
    except ValueError as err:
        raise HTTPException(400, detail=str(err))

@admin_router.post("/candidates/{candidate_id}/reject", response_model=CandidateOut)
async def reject_candidate_endpoint(
    candidate_id: int,
    body: RejectReasonIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    try:
        return reject_candidate(db, candidate_id, admin.id, body.reason)
    except ValueError as err:
        raise HTTPException(400, detail=str(err))