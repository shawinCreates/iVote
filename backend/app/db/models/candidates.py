from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey, Text, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Candidate(Base):
    __tablename__ = "candidates"

    __table_args__ = (UniqueConstraint("student_id", "position_id"),)

    id = Column(Integer, primary_key=True, index=True)
    approved = Column(Boolean, default=False, nullable=False)
    applied_at = Column(DateTime(timezone=True), index=True, server_default=func.now())
    manifesto = Column(String, nullable=False)
    photo_url = Column(String)

    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    position_id = Column(Integer, ForeignKey("positions.id"), nullable=False)

    student = relationship("Student", back_populates="candidate")
    position = relationship("Position", back_populates="candidate")
    vote = relationship("Vote", back_populates="candidate")