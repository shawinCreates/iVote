import json

from fastapi import APIRouter, Depends, Request, File, Form, HTTPException, UploadFile
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session, joinedload
from typing import List, Optional

from app.db.database import get_db
from app.db.models import Candidate, Election, ElectionStatus, HETally, Position, User, UserRole
from app.schemas.schemas import CandidateOut, RejectReasonIn
from app.services.candidate_service import apply_candidacy, approve_candidate, get_all_candidates, get_approved_candidates, get_pending_candidates, increment_views, reject_candidate
from app.services.auth_services import get_user_profile_photo_path
from app.utils.dependencies import require_admin, require_verified
from app.core.config import _ALLOWED_PHOTO_TYPES, _MAX_PHOTO_BYTES
from app.core.cloudinary_storage import upload_to_cloudinary

student_router = APIRouter(prefix="/api",       tags=["Candidates"])
admin_router   = APIRouter(prefix="/api/admin", tags=["Candidates - Admin"])


# ── Student-facing ─────────────────────────────────────────────────────────────

@student_router.get("/candidates/{candidate_id}/photo")
async def candidate_profile_photo(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(404, detail="Candidate not found")

    # Prefer campaign photo, fall back to profile photo
    if c.photo_path:
        return RedirectResponse(c.photo_path)

    owner = db.query(User).filter(User.id == c.user_id).first()
    if owner and owner.profile_photo_path:
        return RedirectResponse(str(owner.profile_photo_path))

    raise HTTPException(404, detail="Photo not found")


# Student-facing
@student_router.get("/candidates/{candidate_id}/photo")
async def candidate_profile_photo(
    candidate_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
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
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(404, detail="Candidate not found")
    increment_views(db, candidate_id)
    return c


@student_router.get("/my-candidacy", response_model=List[CandidateOut])
async def my_candidacy(
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    candidates = (
        db.query(Candidate)
        .options(
            joinedload(Candidate.position).joinedload(Position.election),
            joinedload(Candidate.user)
        )
        .filter(Candidate.user_id == user.id)
        .order_by(Candidate.applied_at.desc())
        .all()
    )

    result = []

    for c in candidates:
        election = c.position.election

        votes_received = None

        if election.status == ElectionStatus.RESULTS_PUBLISHED:
            tally = (
                db.query(HETally)
                .filter(
                    HETally.election_id == election.id,
                    HETally.position_id == c.position_id,
                    HETally.decrypted_tally_json != None
                )
                .first()
            )

            if tally:
                counts = json.loads(tally.decrypted_tally_json)

                # handle string/int key mismatch
                votes_received = (
                    counts.get(str(c.id))
                    or counts.get(c.id)
                    or 0
                )

        # attach dynamic fields (Pydantic will pick them)
        setattr(c, "votes_received", votes_received)
        setattr(c, "election_id", election.id)

        result.append(c)

    return result


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

    if not manifesto.strip():
        raise HTTPException(400, detail="Manifesto cannot be empty")
    if len(manifesto) > 5000:
        raise HTTPException(400, detail="Manifesto must be 5000 characters or fewer")

    if photo.content_type not in _ALLOWED_PHOTO_TYPES:
        raise HTTPException(400, detail="Profile photo must be JPG or PNG")

    content = await photo.read()
    if len(content) > _MAX_PHOTO_BYTES:
        raise HTTPException(400, detail="Profile photo must be smaller than 5 MB")

    public_id = f"cand_{user.id}_{position_id}"
    photo_url = upload_to_cloudinary(content, public_id=public_id, folder="ovs/candidates_photo")

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
