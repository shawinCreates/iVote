from sqlalchemy import Column, Integer, String, DateTime, CheckConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Election(Base):
    __tablename__ = "elections"
    __table_args__ = (CheckConstraint("status IN ('DRAFT','NOMINATION_OPEN','VOTING_OPEN','CLOSED','PUBLISHED')"),)

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    status = Column(String, nullable=False)
    nomination_start = Column(DateTime(timezone=True))
    nomination_end = Column(DateTime(timezone=True))
    voting_start = Column(DateTime(timezone=True))
    voting_end = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    position = relationship("Position", back_populates="election")
    vote = relationship("Vote", back_populates="election")
    vote_status = relationship("VoterStatus", back_populates="election")