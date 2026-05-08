from __future__ import annotations
import hashlib
import json
from typing import List, Tuple

# ← Our own manual implementation — no external library
from app.core.paillier import (
    PaillierPublicKey,
    PaillierPrivateKey,
    EncryptedNumber,
    generate_paillier_keypair,
)

KEY_BITS = 2048

# Key generation 
def generate_keypair(n_bits: int = KEY_BITS) -> Tuple[PaillierPublicKey, PaillierPrivateKey]:
    return generate_paillier_keypair(n_bits)


# Serialisation 

# Serialise a public key to a JSON string. Only n is stored; g = n+1 is always reconstructed.
def pub_to_json(pk: PaillierPublicKey) -> str:
    return json.dumps({"n": str(pk.n)})

# Deserialise a public key from JSON.
def pub_from_json(s: str) -> PaillierPublicKey:
    return PaillierPublicKey(int(json.loads(s)["n"]))

# Serialise a private key to JSON. Stores p and q so λ and μ can be recomputed on load.
def priv_to_json(sk: PaillierPrivateKey) -> str:
    return json.dumps({"p": str(sk.p), "q": str(sk.q)})

# Deserialise a private key from JSON, given its public key.
def priv_from_json(s: str, pk: PaillierPublicKey) -> PaillierPrivateKey:
    d = json.loads(s)
    return PaillierPrivateKey(pk, int(d["p"]), int(d["q"]))

# Convert an EncryptedNumber to a plain dict for JSON storage.
def enc_to_dict(e: EncryptedNumber) -> dict:
    return {"c": str(e.ciphertext())}

# Reconstruct an EncryptedNumber from a stored dict.
def enc_from_dict(d: dict, pk: PaillierPublicKey) -> EncryptedNumber:
    return EncryptedNumber(pk, int(d["c"]))

# Serialise a list of EncryptedNumbers (one per candidate) to JSON.
def ballot_to_json(ballot: List[EncryptedNumber]) -> str:
    return json.dumps([enc_to_dict(e) for e in ballot])

# Deserialise a list of EncryptedNumbers from JSON.
def ballot_from_json(s: str, pk: PaillierPublicKey) -> List[EncryptedNumber]:
    return [enc_from_dict(d, pk) for d in json.loads(s)]

# Fingerprint 
def fingerprint(pk: PaillierPublicKey) -> str:
    """
    SHA-256 fingerprint of the public modulus n.
    Returns a 64-char hex string — safe to display publicly and collision-resistant.
    """
    n_bytes = pk.n.to_bytes((pk.n.bit_length() + 7) // 8, byteorder="big")
    return hashlib.sha256(n_bytes).hexdigest().upper()

# Core operations
def encrypt_ballot(pk: PaillierPublicKey,
                   selected_indices: List[int],
                   num_candidates: int) -> List[EncryptedNumber]:
    """
    Encrypt a binary vote vector.
    selected_indices: 0-based positions of chosen candidates.
    Returns a list of length num_candidates with E(1) at chosen positions, E(0) elsewhere.
    """
    plain = [0] * num_candidates
    for i in selected_indices:
        if 0 <= i < num_candidates:
            plain[i] = 1
    return [pk.encrypt(v) for v in plain]


def homomorphic_sum(ballots: List[List[EncryptedNumber]],
                    pk: PaillierPublicKey,
                    num_candidates: int) -> List[EncryptedNumber]:
    """
    Column-wise homomorphic addition of all encrypted ballots.
    Private key NOT used here.
    """
    acc = [pk.encrypt(0) for _ in range(num_candidates)]
    for ballot in ballots:
        for c, enc in enumerate(ballot):
            acc[c] = acc[c] + enc
    return acc


def decrypt_tally(enc_tally: List[EncryptedNumber],
                  sk: PaillierPrivateKey) -> List[int]:
    """Decrypt aggregate tally. Private key used ONCE here only."""
    return [sk.decrypt(e) for e in enc_tally]


def verify_tally(ballots: List[List[EncryptedNumber]],
                 plain_tally: List[int],
                 sk: PaillierPrivateKey,
                 pk: PaillierPublicKey) -> bool:
    """Public verifiability — re-compute tally and compare."""
    recomputed = decrypt_tally(homomorphic_sum(ballots, pk, len(plain_tally)), sk)
    return recomputed == plain_tally
