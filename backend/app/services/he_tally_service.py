from datetime import datetime, timezone
import json
from sqlalchemy.orm import Session

from app.core.crypto import ballot_from_json, ballot_to_json, decrypt_tally, homomorphic_sum, priv_from_json, pub_from_json, verify_tally
from app.db.models import ApprovalStatus, Candidate, Election, EncryptedVote, HETally
from app.services.audit_notification_service import _audit
from app.utils.helpers import _now

def _run_he_tally(db: Session, election: Election) -> None:
    """
    Run the complete HE tally: aggregate then decrypt.
    """
    if not election.he_public_key_json or not election.he_private_key_json:
        raise ValueError("HE keys not found — cannot tally")

    pk = pub_from_json(election.he_public_key_json)
    sk = priv_from_json(election.he_private_key_json, pk)

    all_verified = True

    for position in election.positions:
        approved = (db.query(Candidate)
                    .filter(Candidate.position_id == position.id,
                            Candidate.approval_status == ApprovalStatus.APPROVED)
                    .order_by(Candidate.id)
                    .all())
        if not approved:
            continue

        num_cands  = len(approved)
        cand_order = [c.id for c in approved]

        rows = (db.query(EncryptedVote)
                .filter(EncryptedVote.election_id == election.id,
                        EncryptedVote.position_id == position.id)
                .all())

        if rows:
            ballots   = [ballot_from_json(r.encrypted_ballot_json, pk) for r in rows]
            enc_tally = homomorphic_sum(ballots, pk, num_cands)
        else:
            enc_tally = [pk.encrypt(0) for _ in range(num_cands)]

        counts = decrypt_tally(enc_tally, sk)

        verified = False
        if rows:
            try:
                verified = verify_tally(
                    [ballot_from_json(r.encrypted_ballot_json, pk) for r in rows],
                    counts, sk, pk,
                )
            except Exception:
                verified = False
        else:
            verified = all(v == 0 for v in counts)

        if not verified:
            all_verified = False

        counts_dict = {str(cand_order[i]): counts[i] for i in range(len(counts))}

        now = _now()
        tally_row = (db.query(HETally)
                     .filter(HETally.election_id == election.id,
                             HETally.position_id == position.id)
                     .first())
        if tally_row:
            tally_row.candidate_order_json = json.dumps(cand_order)
            tally_row.encrypted_tally_json = ballot_to_json(enc_tally)
            tally_row.decrypted_tally_json = json.dumps(counts_dict)
            tally_row.computed_at  = now
            tally_row.decrypted_at = now
        else:
            db.add(HETally(
                election_id=election.id,
                position_id=position.id,
                candidate_order_json=json.dumps(cand_order),
                encrypted_tally_json=ballot_to_json(enc_tally),
                decrypted_tally_json=json.dumps(counts_dict),
                computed_at=now,
                decrypted_at=now,
            ))

    
    election.he_private_key_json = None
    election.he_tally_completed  = True
    _audit(db, "HE_TALLY_COMPLETED", None, election_id=election.id,
           details=f"Homomorphic tally complete. Verified: {all_verified}. Private key erased.")
    db.commit()
