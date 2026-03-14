from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from pathlib import Path
import shutil, os
from datetime import timedelta

from app.services.auth_services import authenticate_user, create_access_token, create_user, get_user_by_email, get_user_by_tu_number
from app.dependencies import get_db, get_current_user

from app.schemas.token import Token
from app.schemas.user import UserCreate, UserResponse
from app.db.models import User, Student
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES, ID_CARD_DIR

router = APIRouter(tags=["Authentication"])

ID_CARD_DIR.mkdir(parents=True, exist_ok=True)

@router.post("/login", response_model=Token)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Incorrect email or password")
    
    student = db.query(Student).filter(Student.user_id == user.id).first()
    if not student:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Student record not found")

    token = create_access_token({"sub": user.email}, timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    return Token(
        access_token=token,
        token_type="bearer",
        role=user.role.value,
        full_name=student.full_name,
        is_verified=user.is_verified
    )

@router.post("/signup", response_model=UserResponse)
@router.post("/register", response_model=UserResponse)
async def register(
    email: str = Form(...),
    password: str = Form(...),
    full_name: str = Form(...),
    tu_registration_number: str = Form(...),
    faculty: str = Form(...),
    program: str = Form(...),
    year_or_sem: int = Form(...),
    id_card: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    if get_user_by_email(db, email):
        raise HTTPException(status_code=400, detail="Email already registered")
    if get_user_by_tu_number(db, tu_registration_number):
        raise HTTPException(status_code=400, detail="TU Registration number already registered")

    allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"]
    if id_card.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Only JPG, PNG, JPEG or PDF allowed")
    
    ext = os.path.splitext(id_card.filename)[1].lower()
    file_path = ID_CARD_DIR / f"idcard_{tu_registration_number}{ext}"
    with file_path.open("wb") as buffer:
        shutil.copyfileobj(id_card.file, buffer)

    relative_path = f"uploads/id_cards/idcard_{tu_registration_number}{ext}"

    user_data = UserCreate(
        email=email,
        full_name=full_name,
        tu_registration_number=tu_registration_number,
        faculty=faculty,
        program=program,
        year_or_sem=year_or_sem,
        password=password 
    )
    user, student = create_user(db, user_data, relative_path)
    return UserResponse(
        id=user.id,
        created_at=user.created_at,
        email=user.email,
        full_name=student.full_name,
        tu_registration_number=student.tu_registration_number,
        faculty=student.faculty,
        program=student.program,
        year_or_sem=student.year_or_sem,
        role=user.role.value,
        is_verified=user.is_verified,
    )

@router.get("/me", response_model=UserResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db) 
):
    student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if not student:
        raise HTTPException(
            status_code=404,
            detail="Student profile missing"
        )

    return UserResponse(
        id=current_user.id,
        created_at=current_user.created_at,
        email=current_user.email,
        full_name=student.full_name,
        tu_registration_number=student.tu_registration_number,
        faculty=student.faculty,
        program=student.program,
        year_or_sem=student.year_or_sem,
        role=current_user.role.value,
        is_verified=current_user.is_verified
    )