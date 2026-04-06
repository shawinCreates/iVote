import json
from typing import List
from sqlalchemy.orm import Session

from app.db.models import ApprovalStatus, Candidate, HETally, User, UserRole, VoterParticipation
from app.schemas.schemas import CandidateResult, ElectionResults, PositionResult
from app.services.election_service import get_election

def get_election_results(db: Session, election_id: int) -> ElectionResults:
    election = get_election(db, election_id)
    if not election:
        raise ValueError("Election not found")

    total_eligible = (
        db.query(User)
        .filter(
            User.is_verified == True,
            User.is_active == True,
            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]),
        )
        .count()
    )
    total_cast = (
        db.query(VoterParticipation)
        .filter(VoterParticipation.election_id == election_id)
        .count()
    )
    turnout_pct = round((total_cast / total_eligible * 100) if total_eligible > 0 else 0.0, 2)

    # Check if HE tally has been decrypted
    tally_verified = election.he_tally_completed

    position_results: List[PositionResult] = []

    for position in election.positions:
        # Try HE tally first
        tally = (
            db.query(HETally)
            .filter(
                HETally.election_id == election_id,
                HETally.position_id == position.id,
            )
            .first()
        )

        if tally and tally.decrypted_tally_json:
            import json
            decrypted: dict = json.loads(tally.decrypted_tally_json)
            # decrypted is {candidate_id: vote_count, ...}
            approved = (
                db.query(Candidate)
                .filter(
                    Candidate.position_id == position.id,
                    Candidate.approval_status == ApprovalStatus.APPROVED,
                )
                .all()
            )
            total_pos_votes = sum(decrypted.values())
            rows = sorted(
                [(c, decrypted.get(str(c.id), 0)) for c in approved],
                key=lambda x: x[1],
                reverse=True,
            )
            candidate_results = [
                CandidateResult(
                    candidate_id=c.id,
                    candidate_name=c.user.full_name,
                    photo_path=c.photo_path,
                    party_affiliation=c.party_affiliation,
                    vote_count=count,
                    percentage=round((count / total_pos_votes * 100) if total_pos_votes > 0 else 0.0, 2),
                    is_winner=(i < position.max_votes and count > 0),
                )
                for i, (c, count) in enumerate(rows)
            ]
        else:
            # Fallback: plaintext vote counting (for dev/testing without HE)
            from app.db.models import EncryptedVote
            approved = (
                db.query(Candidate)
                .filter(
                    Candidate.position_id == position.id,
                    Candidate.approval_status == ApprovalStatus.APPROVED,
                )
                .all()
            )
            # Count participation per candidate via encrypted_votes table
            vote_counts = {c.id: 0 for c in approved}
            enc_votes = (
                db.query(EncryptedVote)
                .filter(
                    EncryptedVote.election_id == election_id,
                    EncryptedVote.position_id == position.id,
                )
                .all()
            )
            # Without HE decryption we can only show total ballots cast per position
            total_pos_votes = len(enc_votes)
            candidate_results = [
                CandidateResult(
                    candidate_id=c.id,
                    candidate_name=c.user.full_name,
                    photo_path=c.photo_path,
                    party_affiliation=c.party_affiliation,
                    vote_count=0,
                    percentage=0.0,
                    is_winner=False,
                )
                for c in approved
            ]

        position_results.append(PositionResult(
            position_id=position.id,
            position_name=position.name,
            max_votes=position.max_votes,
            total_votes=total_pos_votes if 'total_pos_votes' in dir() else 0,
            candidates=candidate_results,
            verified=tally_verified,
        ))

    return ElectionResults(
        election_id=election.id,
        election_name=election.name,
        total_eligible=total_eligible,
        total_cast=total_cast,
        turnout_pct=turnout_pct,
        tally_verified=tally_verified,
        published_at=election.results_published_at,
        positions=position_results,
    )
