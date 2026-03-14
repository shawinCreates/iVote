from sqlalchemy.orm import Session
from jose import JWTError, jwt 
from typing import Optional, Tuple
from datetime import datetime, timedelta

from app.core.config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
from app.core.security import verify_password, get_password_hash
from app.db.models import User, UserRole, Student
from app.schemas.user import UserCreate

def create_access_token(data: dict, expires_delta: Optional[timedelta]= None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def authenticate_user(db: Session, email:str, password:str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user

def create_user(db: Session, user: UserCreate, id_card_path: str) -> Tuple[User, Student]:
    db_user = User(
        email=user.email,
        password_hash=get_password_hash(user.password),
        role=UserRole.STUDENT
    )
    db.add(db_user)
    db.flush()

    db_student = Student(
        user_id=db_user.id,
        full_name=user.full_name,
        tu_registration_number=user.tu_registration_number,
        faculty=user.faculty,
        program=user.program,
        year_or_sem=user.year_or_sem,
        id_card_path=id_card_path
    )
    db.add(db_student)
    db.commit()
    db.refresh(db_user)
    db.refresh(db_student)
    return db_user, db_student

def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.query(User).filter(User.email == email).first()

def get_user_by_tu_number(db: Session, tu_number: str) -> Optional[Student]:
    return db.query(Student).filter(Student.tu_registration_number == tu_number).first()

