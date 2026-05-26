from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import FaceVerifyIn, HEBallotIn, HasVotedOut, VoteConfirmation
from app.services.audit_notification_service import _audit
from app.services.face_verification_service import MAX_RETRIES, check_liveness, verify_face
from app.services.voting_service import cast_he_ballot, get_participation
from app.utils.dependencies import require_verified
from app.utils.helpers import _now

router = APIRouter(prefix="/api", tags=["Voting"])


@router.post("/voting/verify-face")
async def face_verify(
    payload: FaceVerifyIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    if not user.profile_photo_path:
        raise HTTPException(
            status_code=400,
            detail="No profile photo on file. Please contact the Election Head.",
        )

    profile_source = str(user.profile_photo_path)

    try:
        # ── Step 1: liveness check ──────────────────────────────────────────
        if payload.liveness_frames:
            liveness = check_liveness(payload.liveness_frames)
            if not liveness["live"]:
                _audit(db, "FACE_LIVENESS_FAIL", user.id, actor_role="student",
                       details=f"reason={liveness['reason']} ear_var={liveness.get('variance')}")
                db.commit()
                raise HTTPException(
                    status_code=403,
                    detail={
                        "reason": "liveness_failed",
                        "message": "Liveness check failed — no blink detected. "
                                   "Please look at the camera and blink naturally when prompted.",
                        "retries_allowed": MAX_RETRIES,
                    },
                )

        # ── Step 2: face match ──────────────────────────────────────────────
        result = verify_face(profile_source, payload.live_image_b64)

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    _audit(
        db, "FACE_VERIFY_ATTEMPT", user.id,
        actor_role="student",
        details=(
            f"verified={result['verified']} "
            f"score={result.get('similarity') or result.get('distance')}"
        ),
    )
    db.commit()

    if not result["verified"]:
        raise HTTPException(
            status_code=403,
            detail={
                "reason": result.get("reason", "face_mismatch"),
                "message": (
                    "No face detected. Please ensure your face is clearly visible and try again."
                    if result.get("reason") == "no_face_detected"
                    else "Your face did not match the photo on your account. "
                         "Please ensure good lighting and try again."
                ),
                "retries_allowed": MAX_RETRIES,
            },
        )

    user.last_face_verification_at = _now()
    db.commit()

    return {"verified": True}


@router.post("/vote", response_model=VoteConfirmation)
async def cast_vote(
    ballot: HEBallotIn,
    request: Request,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    try:
        return cast_he_ballot(db, user.id, ballot, ip=request.client.host)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/elections/{election_id}/has-voted", response_model=HasVotedOut)
async def check_voted(
    election_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(require_verified),
):
    vparticipation = get_participation(db, user.id, election_id)
    if vparticipation:
        return HasVotedOut(
            has_voted=True,
            confirmation_code=vparticipation.confirmation_code,
            voted_at=vparticipation.voted_at,
        )
    return HasVotedOut(has_voted=False)
