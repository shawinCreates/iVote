from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator, model_validator
from db.models import ApprovalStatus, ElectionStatus, UserRole

MANIFESTO_MAX_LEN = 5000 

# User 
class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    tu_registration_number: str
    faculty: str
    year: int
    role: UserRole
    is_verified: bool
    is_active: bool
    rejection_reason: Optional[str] = None
    created_at: datetime
    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# Election
class PositionIn(BaseModel):
    name: str
    description: Optional[str] = None
    max_votes: int = 1

class PositionOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    max_votes: int
    class Config:
        from_attributes = True

class ElectionIn(BaseModel):
    name: str
    description: Optional[str] = None
    nomination_start: datetime
    nomination_end: datetime
    voting_start: datetime
    voting_end: datetime
    positions: List[PositionIn]

    @field_validator("nomination_start")
    @classmethod
    def nom_start_in_future(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        # Make naive datetimes timezone-aware for comparison
        v_aware = v.replace(tzinfo=timezone.utc) if v.tzinfo is None else v
        if v_aware <= now:
            raise ValueError("Nomination start must be in the future")
        return v

    @field_validator("nomination_end")
    @classmethod
    def nom_end_after_start(cls, v, info):
        if "nomination_start" in info.data and v <= info.data["nomination_start"]:
            raise ValueError("Nomination end must be after nomination start")
        return v

    @field_validator("voting_start")
    @classmethod
    def vote_start_after_nom_end(cls, v, info):
        if "nomination_end" in info.data and v < info.data["nomination_end"]:
            raise ValueError("Voting start must be on or after nomination end")
        return v

    @field_validator("voting_end")
    @classmethod
    def vote_end_after_start(cls, v, info):
        if "voting_start" in info.data and v <= info.data["voting_start"]:
            raise ValueError("Voting end must be after voting start")
        return v

class ElectionOut(BaseModel):
    id: int
    name: str
    description: Optional[str]
    nomination_start: datetime
    nomination_end: datetime
    voting_start: datetime
    voting_end: datetime
    status: ElectionStatus
    candidates_locked: bool
    he_key_fingerprint: Optional[str]
    he_tally_completed: bool
    results_published_at: Optional[datetime]
    created_at: datetime
    positions: List[PositionOut]
    class Config:
        from_attributes = True


# Candidate 
class CandidateOut(BaseModel):
    id: int
    user_id: int
    position_id: int
    manifesto: Optional[str]
    party_affiliation: Optional[str]
    photo_path: Optional[str]
    approval_status: ApprovalStatus
    rejection_reason: Optional[str]
    profile_views: int
    applied_at: datetime
    approved_at: Optional[datetime]
    user: UserOut
    position: PositionOut
    class Config:
        from_attributes = True


# Voting — HE ballot
class EncBallotIn(BaseModel):
    """One position's encrypted ballot from the browser."""
    position_id:           int
    candidate_ids:         List[int]   # server-side validation only
    encrypted_ballot_json: str

class HEBallotIn(BaseModel):
    election_id: int
    positions: List[EncBallotIn]

    @field_validator("positions")
    @classmethod
    def positions_not_empty(cls, v):
        if not v:
            raise ValueError("Ballot must include at least one position")
        return v

class VoteConfirmation(BaseModel):
    confirmation_code: str
    voted_at: datetime
    message: str


# Results 
class CandidateResult(BaseModel):
    candidate_id: int
    candidate_name: str
    photo_path: Optional[str]
    party_affiliation: Optional[str]
    vote_count: int
    percentage: float
    is_winner: bool

class PositionResult(BaseModel):
    position_id: int
    position_name: str
    max_votes: int
    total_votes: int
    candidates: List[CandidateResult]
    verified: bool = False

class ElectionResults(BaseModel):
    election_id: int
    election_name: str
    total_eligible: int
    total_cast: int
    turnout_pct: float
    tally_verified: bool
    published_at: Optional[datetime]
    positions: List[PositionResult]


# Others
class RejectReasonIn(BaseModel):
    reason: Optional[str] = None

class NotificationOut(BaseModel):
    id: int
    election_id: Optional[int] = None   # Fix #16
    title: str
    message: str
    notification_type: str
    is_read: bool
    created_at: datetime
    class Config:
        from_attributes = True

class HasVotedOut(BaseModel):
    has_voted: bool
    confirmation_code: Optional[str] = None
    voted_at: Optional[datetime] = None

class HEPublicKeyOut(BaseModel):
    election_id: int
    public_key_json: str
    fingerprint: str
