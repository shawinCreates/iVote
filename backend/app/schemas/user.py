from pydantic import BaseModel, EmailStr
from datetime import datetime
from typing import Optional, List
from app.db.models import UserRole

class UserBase(BaseModel):
    email:EmailStr

class StudentBase(BaseModel):
    full_name: str
    tu_registration_number: str
    faculty: str
    program: str
    year_or_sem: int

class UserCreate(UserBase):
    password: str
    full_name: str
    tu_registration_number: str
    faculty: str
    program: str
    year_or_sem: int

class UserResponse(UserBase):
    id: int
    role :UserRole
    is_verified: bool
    is_active: bool
    created_at: datetime
    
    class Config:
        from_attributes = True