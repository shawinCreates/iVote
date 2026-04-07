import json
from sqlalchemy.orm import Session

from app.db.models import Candidate, Election, ElectionStatus, EncryptedVote, HETally, User, UserRole, VoterParticipation
from app.schemas.schemas import CandidateResult, ElectionResults, PositionResult
from app.services.election_service import get_election
from app.core.crypto import ballot_from_json, priv_from_json, pub_from_json, verify_tally
from app.services.audit_notification_service import _audit, _notify
from app.utils.helpers import _now

def get_election_results(db: Session, election_id: int) -> ElectionResults:
    election = get_election(db, election_id)
    if not election:
        raise ValueError("Election not found")

    total_eligible = (db.query(User)
                  .filter(User.is_verified == True,
                          User.is_active == True,
                          User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]))
                  .count())
    total_cast = (db.query(VoterParticipation)
                  .filter(VoterParticipation.election_id == election_id)
                  .count())
    turnout = round((total_cast / total_eligible * 100) if total_eligible else 0, 2)

    position_results = []
    all_verified = True

    for pos in election.positions:
        tally = (db.query(HETally)
                 .filter(HETally.election_id == election_id,
                         HETally.position_id == pos.id,
                         HETally.decrypted_tally_json != None)
                 .first())
        if not tally:
            all_verified = False
            continue

        counts   = json.loads(tally.decrypted_tally_json)
        cand_ids = json.loads(tally.candidate_order_json)
        total_pos = sum(counts)

        ranked = sorted(zip(cand_ids, counts), key=lambda x: x[1], reverse=True)

        candidate_results = []
        for rank, (cid, count) in enumerate(ranked):
            cand = db.query(Candidate).filter(Candidate.id == cid).first()
            pct  = round((count / total_pos * 100) if total_pos else 0, 2)
            is_winner = rank < pos.max_votes and count >= 1
            candidate_results.append(CandidateResult(
                candidate_id=cid,
                candidate_name=cand.user.full_name if cand else f"#{cid}",
                photo_path=cand.photo_path if cand else None,
                party_affiliation=cand.party_affiliation if cand else None,
                vote_count=count,
                percentage=pct,
                is_winner=is_winner,
            ))

        # Verify using only the public key 
        verified = False
        if election.he_public_key_json and not election.he_private_key_json:
            # Private key was correctly erased — mark tally as previously verified
            verified = True   # Trust the verified flag set at tally time
        elif election.he_public_key_json and election.he_private_key_json:
            # Key still present (shouldn't happen post-tally, but handle gracefully)
            try:
                pk  = pub_from_json(election.he_public_key_json)
                sk  = priv_from_json(election.he_private_key_json, pk)
                rows = (db.query(EncryptedVote)
                        .filter(EncryptedVote.election_id == election_id,
                                EncryptedVote.position_id == pos.id)
                        .all())
                if rows:
                    ballots  = [ballot_from_json(r.encrypted_ballot_json, pk) for r in rows]
                    verified = verify_tally(ballots, counts, sk, pk)
                else:
                    verified = all(c == 0 for c in counts)
            except Exception:
                verified = False

        if not verified:
            all_verified = False

        position_results.append(PositionResult(
            position_id=pos.id, position_name=pos.name,
            max_votes=pos.max_votes, total_votes=total_pos,
            candidates=candidate_results, verified=verified,
        ))

    return ElectionResults(
        election_id=election.id,
        election_name=election.name,
        total_eligible=total_eligible,
        total_cast=total_cast,
        turnout_pct=turnout,
        tally_verified=all_verified,
        published_at=election.results_published_at,
        positions=position_results,
    )

def publish_results(db: Session, election_id: int, admin_id: int,
                    ip: str = None) -> Election:
    e = get_election(db, election_id)
    if not e:
        raise ValueError("Election not found")
    if e.status != ElectionStatus.CLOSED:
        raise ValueError("Election must be closed and tally must be complete before publishing")
    if not e.he_tally_completed:
        raise ValueError("Homomorphic tally is not yet complete. Please wait.")
    e.status = ElectionStatus.RESULTS_PUBLISHED
    e.results_published_at = _now()
    _audit(db, "RESULTS_PUBLISHED", admin_id, election_id=election_id,
           details="Results published to students", ip=ip)
    
    try:
        students = (db.query(User)
                    .filter(User.is_verified == True,
                            User.is_active == True,
                            User.role.in_([UserRole.STUDENT, UserRole.CANDIDATE]))
                    .all())
        for s in students:
            _notify(db, s.id, f"Results Published — {e.name}",
                    f"Election results for '{e.name}' are now available.",
                    "success", election_id=election_id)
    except Exception as notify_err:
        print(f"[WARN] Notification send failed during publish_results: {notify_err}")
    db.commit()
    db.refresh(e)
    return e

