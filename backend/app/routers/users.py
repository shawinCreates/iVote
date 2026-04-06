from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session
from typing import List

from app.db.database import get_db
from app.db.models import User
from app.schemas.schemas import UserOut, RejectReasonIn
from app.services.auth_services import (
    require_admin,
    get_pending_students,
    get_all_students,
    verify_student as verify_student_service,
    reject_student as reject_student_service
)

router = APIRouter(prefix="/api/admin/users", tags=["Users"])

@router.get("/students/pending", response_model=List[UserOut])
async def list_pending_students(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return get_pending_students(db)

@router.get("/students/all", response_model=List[UserOut])
async def list_all_students(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    return get_all_students(db)

@router.post("/students/{user_id}/verify", response_model=UserOut)
async def verify_student(
    user_id: int,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    user = verify_student_service(db, user_id, admin.id, ip=request.client.host)
    if not user:
        raise HTTPException(status_code=404, detail="Student not found")
    return user

@router.post("/students/{user_id}/reject", response_model=bool)
async def reject_student(
    user_id: int,
    body: RejectReasonIn,
    request: Request,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    success = reject_student_service(db, user_id, admin.id, reason=body.reason, ip=request.client.host)
    if not success:
        raise HTTPException(status_code=404, detail="Student not found")
    return success
