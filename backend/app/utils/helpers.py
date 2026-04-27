from jose import jwt
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from app.core.config import ACCESS_TOKEN_EXPIRE_DELTA, ALGORITHM, SECRET_KEY
from app.core.security import verify_password
from app.db.models import User

def _now() -> datetime:
    return datetime.now(timezone.utc)

def create_token(user_id: int, role: str) -> str:
    expire = datetime.now(timezone.utc) + ACCESS_TOKEN_EXPIRE_DELTA
    return jwt.encode(
        {"sub": str(user_id), "role": role, "exp": expire},
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def authenticate(db: Session, email: str, password: str) -> Optional[User]:
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        return None
    return user
