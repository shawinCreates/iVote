from pydantic import BaseModel
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    full_name: str
    is_verified: bool

class TokenData(BaseModel):
    email: Optional[str]= None