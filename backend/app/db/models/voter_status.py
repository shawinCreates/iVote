from sqlalchemy import Column, Integer, Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.database import Base

class VoterStatus(Base):
    __tablename__ = "voter_status"
    __table_args__ = (UniqueConstraint("student_id", "election_id"),)

    id = Column(Integer, primary_key=True)
    has_voted = Column(Boolean, default=False, index=True, nullable=False)

    student_id = Column(Integer, ForeignKey("students.id"), nullable=False)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)

    student = relationship("Student", back_populates="vote_status")
    election = relationship("Election", back_populates="vote_status")