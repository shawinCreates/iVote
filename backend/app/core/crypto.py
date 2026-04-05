from __future__ import annotations
import hashlib
import json
from typing import List, Tuple

import phe
from phe import paillier


KEY_BITS = 2048


# Key generation 
def generate_keypair(n_bits: int = KEY_BITS) -> Tuple[paillier.PaillierPublicKey,
                                                        paillier.PaillierPrivateKey]:
    return paillier.generate_paillier_keypair(n_length=n_bits)


# Serialisation 
def pub_to_json(pk: paillier.PaillierPublicKey) -> str:
    return json.dumps({"n": str(pk.n)})

def pub_from_json(s: str) -> paillier.PaillierPublicKey:
    return paillier.PaillierPublicKey(int(json.loads(s)["n"]))

def priv_to_json(sk: paillier.PaillierPrivateKey) -> str:
    return json.dumps({"p": str(sk.p), "q": str(sk.q)})

def priv_from_json(s: str, pk: paillier.PaillierPublicKey) -> paillier.PaillierPrivateKey:
    d = json.loads(s)
    return paillier.PaillierPrivateKey(pk, int(d["p"]), int(d["q"]))

def enc_to_dict(e: paillier.EncryptedNumber) -> dict:
    return {"c": str(e.ciphertext()), "x": e.exponent}

def enc_from_dict(d: dict, pk: paillier.PaillierPublicKey) -> paillier.EncryptedNumber:
    return paillier.EncryptedNumber(pk, int(d["c"]), int(d["x"]))

def ballot_to_json(ballot: List[paillier.EncryptedNumber]) -> str:
    return json.dumps([enc_to_dict(e) for e in ballot])

def ballot_from_json(s: str, pk: paillier.PaillierPublicKey) -> List[paillier.EncryptedNumber]:
    return [enc_from_dict(d, pk) for d in json.loads(s)]


# Fingerprint 
def fingerprint(pk: paillier.PaillierPublicKey) -> str:
    """
    SHA-256 fingerprint of the public modulus n.
    Returns a 64-char hex string — safe to display publicly and collision-resistant.
    """
    n_bytes = pk.n.to_bytes((pk.n.bit_length() + 7) // 8, byteorder="big")
    return hashlib.sha256(n_bytes).hexdigest().upper()


# Core operations
def encrypt_ballot(pk: paillier.PaillierPublicKey,
                   selected_indices: List[int],
                   num_candidates: int) -> List[paillier.EncryptedNumber]:
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


def homomorphic_sum(ballots: List[List[paillier.EncryptedNumber]],
                    pk: paillier.PaillierPublicKey,
                    num_candidates: int) -> List[paillier.EncryptedNumber]:
    """
    Column-wise homomorphic addition of all encrypted ballots.
    Private key NOT used here.
    """
    acc = [pk.encrypt(0) for _ in range(num_candidates)]
    for ballot in ballots:
        for c, enc in enumerate(ballot):
            acc[c] = acc[c] + enc
    return acc


def decrypt_tally(enc_tally: List[paillier.EncryptedNumber],
                  sk: paillier.PaillierPrivateKey) -> List[int]:
    """Decrypt aggregate tally. Private key used ONCE here only."""
    return [sk.decrypt(e) for e in enc_tally]


def verify_tally(ballots: List[List[paillier.EncryptedNumber]],
                 plain_tally: List[int],
                 sk: paillier.PaillierPrivateKey,
                 pk: paillier.PaillierPublicKey) -> bool:
    """Public verifiability — re-compute tally and compare."""
    recomputed = decrypt_tally(homomorphic_sum(ballots, pk, len(plain_tally)), sk)
    return recomputed == plain_tally
