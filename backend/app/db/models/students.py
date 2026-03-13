from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.database import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    tu_registration_number = Column(String, unique=True, nullable=False, index=True)
    full_name = Column(String, nullable=False)
    faculty = Column(String, nullable=False)
    program = Column(String, nullable=False)
    year_or_sem = Column(Integer, nullable=False)
    id_card_path = Column(String)
    
    user_id = Column(Integer, ForeignKey("users.id"), unique=True, nullable=False)

    user = relationship("User", back_populates="student", uselist=False)
    candidate = relationship("Candidate", back_populates="student", cascade="all, delete-orphan")
    vote_status = relationship("VoterStatus", back_populates="student", cascade="all, delete-orphan")