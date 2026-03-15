from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from app.dependencies import get_db, get_admin
from app.db.models import User
from app.schemas.user import UserResponse, Re
from app.services.student_services import get_pending_students, get_all_students, verify_student, reject_student

router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/students/pending", response_model=List[UserResponse])
async def get_pending_students(db: Session = Depends(get_db), admin: User = Depends(get_admin)):
    return get_pending_students(db)

@router.get("/students/all", response_model=List[UserResponse])
async def get_all_students(db: Session = Depends(get_db), admin: User = Depends(get_admin)):
    return get_all_students(db)

@router.post("/students/{user_id}/verify")
async def verify_student(user_id: int, request: Request, db:Session = Depends(get_db), admin:User = Depends(get_admin)):
    user = verify_student(db, user_id, admin.id, request.client.host)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Student verified successfully"}

@router.post("/students/{user_id}/reject")
async def reject_student(user_id: int, request: Request, db: Session = Depends(get_db), admin: User = Depends(get_admin)):
    success = reject_student(db, user_id, admin.id, request.client.host)
    if not success:
        raise HTTPException(status_code=404, detail="User not found")
    return {"message": "Student rejected"}