from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    tu_registration_number = Column(String, unique=True, nullable=False, index=True)
    name = Column(String, nullable=False)
    phone = Column(Integer, nullable=False)
    faculty = Column(String, nullable=False)
    program = Column(String, nullable=False)
    year_or_sem = Column(Integer)
    
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="student")
    candidate = relationship("Candidate", back_populates="student")
    vote_status = relationship("VoterStatus", back_populates="student")