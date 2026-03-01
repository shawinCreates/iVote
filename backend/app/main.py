from fastapi import FastAPI, Depends
from typing import Annotated
from models.users import User
from database import engine, SessionLocal
from sqlalchemy.orm import Session

app = FastAPI()
Base.metadata.create_all(bind=engine)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

db_dependency = Annotated[Session, Depends(get_db)]
