from __future__ import annotations
from datetime import datetime, timezone
import enum

from sqlalchemy import (
    Boolean, Column, DateTime, Enum as SAEnum, ForeignKey,
    Integer, String, Text, UniqueConstraint
)
from sqlalchemy.orm import relationship
from .database import Base


def _utcnow():
    """Timezone-aware UTC now — replaces deprecated datetime.utcnow()."""
    return datetime.now(timezone.utc)


# Enumerations 
class UserRole(str, enum.Enum):
    STUDENT       = "student"
    CANDIDATE     = "candidate"
    ELECTION_HEAD = "election_head"

class ElectionStatus(str, enum.Enum):
    DRAFT              = "draft"
    NOMINATION_OPEN    = "nomination_open"
    VOTING_OPEN        = "voting_open"
    CLOSED             = "closed"
    RESULTS_PUBLISHED  = "results_published"

class ApprovalStatus(str, enum.Enum):
    PENDING  = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


#  User
class User(Base):
    __tablename__ = "users"

    id                     = Column(Integer, primary_key=True, index=True)
    email                  = Column(String(255), unique=True, index=True, nullable=False)
    password_hash          = Column(String(255), nullable=False)
    full_name              = Column(String(255), nullable=False)
    tu_registration_number = Column(String(100), unique=True, nullable=False)
    faculty                = Column(String(100), nullable=False)
    year                   = Column(Integer, nullable=False)
    role                   = Column(SAEnum(UserRole), nullable=False, default=UserRole.STUDENT)
    is_verified            = Column(Boolean, nullable=False, default=False)
    is_active              = Column(Boolean, nullable=False, default=True)
    id_card_path           = Column(String(500), nullable=True)
    rejection_reason       = Column(Text, nullable=True)
    created_at             = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    candidacies    = relationship("Candidate",          back_populates="user",  cascade="all, delete-orphan")
    participations = relationship("VoterParticipation", back_populates="voter", cascade="all, delete-orphan")
    audit_logs     = relationship("AuditLog",           back_populates="user")
    notifications  = relationship("Notification",       back_populates="user",  cascade="all, delete-orphan")


# Election
class Election(Base):
    __tablename__ = "elections"

    id                   = Column(Integer, primary_key=True, index=True)
    name                 = Column(String(255), nullable=False)
    description          = Column(Text, nullable=True)
    nomination_start     = Column(DateTime(timezone=True), nullable=False)
    nomination_end       = Column(DateTime(timezone=True), nullable=False)
    voting_start         = Column(DateTime(timezone=True), nullable=False)
    voting_end           = Column(DateTime(timezone=True), nullable=False)
    status               = Column(SAEnum(ElectionStatus), nullable=False, default=ElectionStatus.DRAFT)
    candidates_locked    = Column(Boolean, nullable=False, default=False)
    created_by           = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at           = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    results_published_at = Column(DateTime(timezone=True), nullable=True)
    he_public_key_json   = Column(Text, nullable=True)
    he_private_key_json  = Column(Text, nullable=True)
    he_key_fingerprint   = Column(String(64), nullable=True)  
    he_tally_completed   = Column(Boolean, nullable=False, default=False)

    positions       = relationship("Position",          back_populates="election", cascade="all, delete-orphan")
    participations  = relationship("VoterParticipation",back_populates="election", cascade="all, delete-orphan")
    encrypted_votes = relationship("EncryptedVote",     back_populates="election", cascade="all, delete-orphan")
    tallies         = relationship("HETally",           back_populates="election", cascade="all, delete-orphan")


# Position
class Position(Base):
    __tablename__ = "positions"

    id          = Column(Integer, primary_key=True, index=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=False)
    name        = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    max_votes   = Column(Integer, nullable=False, default=1)

    election   = relationship("Election",  back_populates="positions")
    candidates = relationship("Candidate", back_populates="position", cascade="all, delete-orphan")


# Candidate
class Candidate(Base):
    __tablename__ = "candidates"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    position_id       = Column(Integer, ForeignKey("positions.id"), nullable=False)
    manifesto         = Column(Text, nullable=True)
    party_affiliation = Column(String(255), nullable=True)
    photo_path        = Column(String(500), nullable=True)
    approval_status   = Column(SAEnum(ApprovalStatus), nullable=False, default=ApprovalStatus.PENDING)
    rejection_reason  = Column(Text, nullable=True)
    profile_views     = Column(Integer, nullable=False, default=0)
    applied_at        = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    approved_at       = Column(DateTime(timezone=True), nullable=True)

    user     = relationship("User",     back_populates="candidacies")
    position = relationship("Position", back_populates="candidates")

    __table_args__ = (
        UniqueConstraint("user_id", "position_id", name="uq_candidate_position"),
    )


# VoterParticipation
class VoterParticipation(Base):
    __tablename__ = "voter_participation"

    id                = Column(Integer, primary_key=True, index=True)
    voter_id          = Column(Integer, ForeignKey("users.id"), nullable=False)
    election_id       = Column(Integer, ForeignKey("elections.id"), nullable=False)
    voted_at          = Column(DateTime(timezone=True), nullable=False, default=_utcnow)
    confirmation_code = Column(String(20), nullable=False)

    voter    = relationship("User",     back_populates="participations")
    election = relationship("Election", back_populates="participations")

    __table_args__ = (
        UniqueConstraint("voter_id", "election_id", name="uq_voter_election"),
    )


# EncryptedVote 
class EncryptedVote(Base):
    """
    One row per (participation, position).
    No voter_id — identity severed by design.
    """
    __tablename__ = "encrypted_votes"

    id                    = Column(Integer, primary_key=True, index=True)
    election_id           = Column(Integer, ForeignKey("elections.id"), nullable=False)
    position_id           = Column(Integer, ForeignKey("positions.id"), nullable=False)
    participation_id      = Column(Integer, ForeignKey("voter_participation.id"), nullable=False)
    encrypted_ballot_json = Column(Text, nullable=False)
    submitted_at          = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    election = relationship("Election", back_populates="encrypted_votes")


# HETally 
class HETally(Base):
    __tablename__ = "he_tallies"

    id                   = Column(Integer, primary_key=True, index=True)
    election_id          = Column(Integer, ForeignKey("elections.id"), nullable=False)
    position_id          = Column(Integer, ForeignKey("positions.id"), nullable=False)
    candidate_order_json = Column(Text, nullable=False)
    encrypted_tally_json = Column(Text, nullable=True)
    decrypted_tally_json = Column(Text, nullable=True)
    computed_at          = Column(DateTime(timezone=True), nullable=True)
    decrypted_at         = Column(DateTime(timezone=True), nullable=True)

    election = relationship("Election", back_populates="tallies")

    __table_args__ = (
        UniqueConstraint("election_id", "position_id", name="uq_tally_position"),
    )


# AuditLog
class AuditLog(Base):
    __tablename__ = "audit_logs"

    id          = Column(Integer, primary_key=True, index=True)
    action      = Column(String(100), nullable=False, index=True)
    user_id     = Column(Integer, ForeignKey("users.id"), nullable=True)
    election_id = Column(Integer, ForeignKey("elections.id"), nullable=True)
    details     = Column(Text, nullable=True)
    ip_address  = Column(String(45), nullable=True)
    timestamp   = Column(DateTime(timezone=True), nullable=False, default=_utcnow, index=True)

    user = relationship("User", back_populates="audit_logs")


# Notification
class Notification(Base):
    __tablename__ = "notifications"

    id                = Column(Integer, primary_key=True, index=True)
    user_id           = Column(Integer, ForeignKey("users.id"), nullable=False)
    # Fix #16: election_id scopes notifications to a specific election
    election_id       = Column(Integer, ForeignKey("elections.id"), nullable=True)
    title             = Column(String(255), nullable=False)
    message           = Column(Text, nullable=False)
    notification_type = Column(String(20), nullable=False, default="info")
    is_read           = Column(Boolean, nullable=False, default=False)
    created_at        = Column(DateTime(timezone=True), nullable=False, default=_utcnow)

    user = relationship("User", back_populates="notifications")
