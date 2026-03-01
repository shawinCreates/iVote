from sqlalchemy import Column, Integer, String, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.base import Base

class Position(Base):
    __tablename__ = "positions"
    __table_args__ = (UniqueConstraint("election_id", "name"),)

    id = Column(Integer, primary_key=True, nullable=False, index=True)
    name = Column(String, nullable=False, index=True)

    election_id = Column(Integer, ForeignKey("elections.id"))

    candidate = relationship("Candidate", back_populates="position")
    election = relationship("Election", back_populates="position")
    vote = relationship("Vote", back_populates="position")