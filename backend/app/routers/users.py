from typing import List

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import RejectReasonIn, UserOut
from app.services.auth_services import get_all_students, get_pending_students, reject_student, verify_student
from app.utils.dependencies import require_admin

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/students/pending", response_model=List[UserOut])
async def pending_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_pending_students(db, skip=skip, limit=limit)

@router.get("/students/all", response_model=List[UserOut])
async def all_students(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    return get_all_students(db, skip=skip, limit=limit)

@router.post("/students/{user_id}/verify")
async def verify_student_endpoint(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    user = verify_student(db, user_id, admin.id, request.client.host)
    if not user:
        raise HTTPException(404, detail="Student not found")
    return {"message": "Student verified successfully"}

@router.post("/students/{user_id}/reject")
async def reject_student_endpoint(
    user_id: int,
    body: RejectReasonIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin),
):
    ok = reject_student(db, user_id, admin.id, body.reason, request.client.host)
    if not ok:
        raise HTTPException(404, detail="Student not found")
    return {"message": "Student rejected. They may re-register with corrected information."}
