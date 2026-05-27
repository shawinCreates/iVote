"""
paillier.py — Manual implementation of the Paillier Cryptosystem
================================================================
Implements the full Paillier (1999) probabilistic public-key encryption
scheme from scratch using only Python's built-in `math` and `random`
modules — NO external crypto libraries are imported.

Mathematical background
-----------------------
Key Generation:
  1. Choose two large primes p and q of equal bit-length (n_bits/2 each).
  2. Compute  n = p * q  and  λ = lcm(p-1, q-1).
  3. Choose generator g = n + 1  (the simplified variant; always valid).
  4. Compute μ = λ^(-1) mod n  (the modular inverse of λ mod n).
  Public key  : (n, g)   — in practice g = n+1, so just n suffices.
  Private key : (λ, μ)   together with n.

Encryption of plaintext m ∈ [0, n):
  1. Pick random r, 0 < r < n, gcd(r, n) = 1.
  2. c = g^m * r^n  mod n²

Decryption of ciphertext c:
  1. x = L(c^λ mod n²)  where L(u) = (u - 1) / n
  2. m = x * μ mod n

Homomorphic addition:
  E(m1) * E(m2) mod n² = E(m1 + m2)
  (ciphertext multiplication corresponds to plaintext addition)

Scalar multiplication:
  E(m)^k mod n² = E(k * m)

References
----------
  Paillier, P. (1999). "Public-Key Cryptosystems Based on Composite
  Degree Residuosity Classes." EUROCRYPT 1999, LNCS 1592, pp. 223-238.
"""

from __future__ import annotations
import math
import random


# ---------------------------------------------------------------------------
# Low-level number-theory helpers
# ---------------------------------------------------------------------------

def _miller_rabin(n: int, k: int = 20) -> bool:
    """
    Miller-Rabin probabilistic primality test.
    Returns True if n is *probably* prime (error probability < 4^(-k)).
    k=20 rounds gives a false-positive rate below 10^(-12).
    """
    if n < 2:
        return False
    if n == 2 or n == 3:
        return True
    if n % 2 == 0:
        return False

    # Write n-1 as 2^r * d
    r, d = 0, n - 1
    while d % 2 == 0:
        r += 1
        d //= 2

    for _ in range(k):
        a = random.randrange(2, n - 1)
        x = pow(a, d, n)          # a^d mod n  — fast modular exponentiation built-in

        if x == 1 or x == n - 1:
            continue               # this witness says "probably prime"

        for _ in range(r - 1):
            x = pow(x, 2, n)
            if x == n - 1:
                break
        else:
            return False           # definitely composite

    return True                    # probably prime


def _generate_prime(bits: int) -> int:
    """
    Generate a random prime of exactly `bits` bits.
    Loops until Miller-Rabin accepts a random odd candidate.
    """
    while True:
        # Random odd number with the MSB and LSB both set (ensures `bits` length)
        candidate = random.getrandbits(bits)
        candidate |= (1 << (bits - 1))   # set MSB
        candidate |= 1                    # ensure odd
        if _miller_rabin(candidate):
            return candidate


def _mod_inverse(a: int, m: int) -> int:
    """
    Extended Euclidean Algorithm — returns x such that a*x ≡ 1 (mod m).
    Raises ValueError if gcd(a, m) != 1.
    """
    g, x, _ = _extended_gcd(a, m)
    if g != 1:
        raise ValueError(f"Modular inverse does not exist: gcd({a}, {m}) = {g}")
    return x % m


def _extended_gcd(a: int, b: int):
    """
    Returns (g, x, y) such that a*x + b*y = g = gcd(a, b).
    Iterative version avoids Python recursion limits for large integers.
    """
    old_r, r = a, b
    old_s, s = 1, 0
    while r != 0:
        q = old_r // r
        old_r, r = r, old_r - q * r
        old_s, s = s, old_s - q * s
    return old_r, old_s, (old_r - old_s * a) // b


def _lcm(a: int, b: int) -> int:
    """Least common multiple."""
    return a * b // math.gcd(a, b)


def _L(u: int, n: int) -> int:
    """
    The L function used in Paillier:  L(u) = (u - 1) // n.
    u must satisfy u ≡ 1 (mod n).
    """
    return (u - 1) // n


# ---------------------------------------------------------------------------
# Public / Private key classes
# ---------------------------------------------------------------------------

class PaillierPublicKey:
    """
    Holds the public key (n) and all derived values needed for encryption.

    Attributes
    ----------
    n   : the RSA modulus  (product of two large primes)
    g   : generator in Z*_{n²}, chosen as g = n + 1
    n_sq: n², the group order used throughout
    """

    def __init__(self, n: int):
        self.n    = n
        self.g    = n + 1          # Simplified Paillier: g = n+1 always works
        self.n_sq = n * n

    # ------------------------------------------------------------------
    def encrypt(self, plaintext: int) -> "EncryptedNumber":
        """
        Encrypt an integer `plaintext` ∈ [0, n).

        Steps:
          1. Validate range.
          2. Pick a random r, 1 < r < n, coprime to n.
          3. Compute ciphertext c = g^m * r^n mod n².
        """
        if not (0 <= plaintext < self.n):
            raise ValueError(f"Plaintext {plaintext} out of range [0, n)")

        # Pick r such that gcd(r, n) = 1
        # For n = p*q, r is coprime to n iff r is not divisible by p or q.
        # A random r in (1, n) satisfies this with probability (1 - 1/p)(1 - 1/q) ≈ 1.
        while True:
            r = random.randrange(2, self.n)
            if math.gcd(r, self.n) == 1:
                break

        # g^m mod n² — with g = n+1 this equals (1 + m*n) mod n²
        # (Binomial theorem: (1+n)^m ≡ 1 + m*n  mod n²)
        # We use pow() for generality and clarity.
        gm   = pow(self.g, plaintext, self.n_sq)
        rn   = pow(r, self.n, self.n_sq)
        c    = (gm * rn) % self.n_sq

        return EncryptedNumber(self, c)

    def __repr__(self):
        return f"PaillierPublicKey(n={self.n.bit_length()} bits)"


class PaillierPrivateKey:
    """
    Holds the private key components (λ, μ) needed for decryption.

    Attributes
    ----------
    public_key : the corresponding PaillierPublicKey
    lam        : λ = lcm(p-1, q-1)
    mu         : μ = (L(g^λ mod n²))^(-1) mod n
                 With g = n+1, this simplifies to λ^(-1) mod n.
    p, q       : the prime factors (stored for serialisation)
    """

    def __init__(self, public_key: PaillierPublicKey, p: int, q: int):
        self.public_key = public_key
        self.p = p
        self.q = q

        lam  = _lcm(p - 1, q - 1)
        n    = public_key.n
        n_sq = public_key.n_sq

        # μ = (L(g^λ mod n²))^(-1) mod n
        # With g = n+1:  g^λ mod n² = (1 + n)^λ mod n² = 1 + λ*n mod n²
        # So L(g^λ mod n²) = λ
        # Therefore μ = λ^(-1) mod n
        gl   = pow(public_key.g, lam, n_sq)   # g^λ mod n²
        mu   = _mod_inverse(_L(gl, n), n)

        self.lam = lam
        self.mu  = mu

    # ------------------------------------------------------------------
    def decrypt(self, encrypted: "EncryptedNumber") -> int:
        """
        Decrypt an EncryptedNumber back to a plaintext integer.

        Steps:
          1. Compute c^λ mod n².
          2. Apply L function: x = (c^λ - 1) / n.
          3. Plaintext m = x * μ mod n.
        """
        pk   = self.public_key
        c    = encrypted.ciphertext
        cl   = pow(c, self.lam, pk.n_sq)      # c^λ mod n²
        x    = _L(cl, pk.n)                   # (c^λ - 1) / n
        m    = (x * self.mu) % pk.n
        return m

    def __repr__(self):
        return f"PaillierPrivateKey(bits={self.p.bit_length() + self.q.bit_length()})"


# ---------------------------------------------------------------------------
# Encrypted number — supports homomorphic operations
# ---------------------------------------------------------------------------

class EncryptedNumber:
    """
    Wraps a Paillier ciphertext and overloads + and * for homomorphic ops.

    Homomorphic properties used:
      - Addition     : enc1 + enc2  →  E(m1 + m2)   [multiply ciphertexts mod n²]
      - Scalar mult  : enc * k      →  E(m * k)      [exponentiate ciphertext mod n²]
    """

    def __init__(self, public_key: PaillierPublicKey, ciphertext: int):
        self.public_key = public_key
        self.ciphertext = ciphertext

    # ------------------------------------------------------------------
    def __add__(self, other: "EncryptedNumber") -> "EncryptedNumber":
        """
        Homomorphic addition: E(m1) ⊕ E(m2) = E(m1 + m2).
        Implemented as  c1 * c2 mod n².
        """
        if isinstance(other, EncryptedNumber):
            if self.public_key.n != other.public_key.n:
                raise ValueError("Cannot add EncryptedNumbers from different keys")
            pk   = self.public_key
            new_c = (self.ciphertext * other.ciphertext) % pk.n_sq
            return EncryptedNumber(pk, new_c)
        return NotImplemented

    def __radd__(self, other):
        """Support sum() which starts with integer 0."""
        if other == 0:
            return self
        return self.__add__(other)

    def __mul__(self, scalar: int) -> "EncryptedNumber":
        """
        Scalar multiplication: E(m) ⊗ k = E(m * k).
        Implemented as  c^k mod n².
        scalar must be a non-negative integer.
        """
        if not isinstance(scalar, int) or scalar < 0:
            raise ValueError("Scalar must be a non-negative integer")
        pk    = self.public_key
        new_c = pow(self.ciphertext, scalar, pk.n_sq)
        return EncryptedNumber(pk, new_c)

    def __rmul__(self, scalar: int) -> "EncryptedNumber":
        return self.__mul__(scalar)

    def __repr__(self):
        return f"EncryptedNumber(ciphertext={str(self.ciphertext)[:20]}...)"


# ---------------------------------------------------------------------------
# Key-pair generation
# ---------------------------------------------------------------------------

def generate_paillier_keypair(n_bits: int = 2048):
    """
    Generate a Paillier public/private key pair.

    Parameters
    ----------
    n_bits : total bit-length of the modulus n = p * q.
             p and q are each n_bits // 2 bits long.
             2048 bits is the recommended minimum for production use.

    Returns
    -------
    (PaillierPublicKey, PaillierPrivateKey)
    """
    half = n_bits // 2

    # Generate two distinct primes p and q of equal size.
    # Ensure p != q (astronomically unlikely but we check anyway).
    p = _generate_prime(half)
    while True:
        q = _generate_prime(half)
        if q != p:
            break

    n  = p * q
    pk = PaillierPublicKey(n)
    sk = PaillierPrivateKey(pk, p, q)
    return pk, sk
