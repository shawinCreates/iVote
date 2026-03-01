from sqlalchemy import Column, Integer,  DateTime, ForeignKey
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Vote(Base):
    __tablename__ = "votes"

    id = Column(Integer, primary_key=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    postion_id = Column(Integer, ForeignKey("positions.id"), nullable=False)
    candidate_id = Column(Integer, ForeignKey("candidates.id"), nullable=False)

    candidate = relationship("Candidate", back_populates="vote") 
    position = relationship("Position", back_populates="vote")
    election = relationship("Election", back_populates="vote")