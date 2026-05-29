from __future__ import annotations
from datetime import datetime, timezone
from typing import List, Optional

from pydantic import BaseModel, EmailStr, field_validator
from app.db.models import ApprovalStatus, ElectionStatus, UserRole

MANIFESTO_MAX_LEN = 5000 

# User 
class UserOut(BaseModel):
    id: int
    email: EmailStr
    full_name: Optional[str]
    tu_registration_number: str
    faculty: Optional[str]
    program: Optional[str] = None
    year: Optional[int]
    semester: Optional[int] = None
    role: UserRole
    is_verified: bool
    is_active: bool
    registration_stage: Optional[str] = None
    id_card_path: Optional[str] = None
    profile_photo_path: Optional[str] = None
    rejection_reason: Optional[str] = None
    last_face_verification_at: Optional[datetime] = None
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

    @field_validator("name")
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError("Position name cannot be empty")
        return v.strip()

    @field_validator("max_votes")
    @classmethod
    def max_votes_range(cls, v: int) -> int:
        if v < 1:
            raise ValueError("max_votes must be at least 1")
        if v > 5:
            raise ValueError("max_votes cannot exceed 5")
        return v

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

    @field_validator("positions")
    @classmethod
    def at_least_one_position(cls, v: list) -> list:
        if not v:
            raise ValueError("Election must have at least one position")
        return v

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
    election_id: Optional[int] = None
    votes_received: Optional[int] = None  
    facebook_url: Optional[str] = None
    instagram_url: Optional[str] = None
    contact_email: Optional[str] = None
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
    position_id: int
    candidate_ids: List[int] 
    encrypted_ballot_json: str

class FaceVerifyIn(BaseModel):
    live_image_b64: str                        # base64 JPEG/PNG — the face-match frame
    liveness_frames: list[str] = []            # sequence of frames for blink detection


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
    vote_count: int
    percentage: float
    is_winner: bool
    faculty: Optional[str]
    program: Optional[str]
    year: Optional[str]
    semester: Optional[int]

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
    election_id: Optional[int] = None
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

class LiveStatsOut(BaseModel):
    election_id: int
    election_name: str
    votes_cast: int
    total_eligible: int
    turnout_pct: float