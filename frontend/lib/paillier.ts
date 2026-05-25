function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  if (mod === 1n) return 0n;
  let result = 1n;
  base = base % mod;
  while (exp > 0n) {
    if (exp % 2n === 1n) result = (result * base) % mod;
    exp = exp / 2n;
    base = (base * base) % mod;
  }
  return result;
}

function randomBigInt(max: bigint): bigint {
  const byteLen = Math.ceil(max.toString(16).length / 2) + 1;
  const bytes = new Uint8Array(byteLen);
  let r: bigint;
  do {
    crypto.getRandomValues(bytes);
    r = BigInt("0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join(""));
    r = r % max;
  } while (r === 0n);
  return r;
}

export function encrypt(m: number | bigint, nStr: string) {
  const n = BigInt(nStr);
  const n2 = n * n;
  const g = n + 1n;
  const r = randomBigInt(n);
  const mBig = BigInt(m);
  const gm = modPow(g, mBig, n2);
  const rn = modPow(r, n, n2);
  const c = (gm * rn) % n2;
  return { c: c.toString(), x: 0 };
}

export function encryptBallot(selectedIndices: number[], numCandidates: number, nStr: string): string {
  const selectedSet = new Set(selectedIndices);
  const encryptedVector: string[] = [];
  for (let i = 0; i < numCandidates; i++) {
    const vote = selectedSet.has(i) ? 1 : 0;
    const result = encrypt(vote, nStr);
    encryptedVector.push(result.c);
  }
  return JSON.stringify(encryptedVector);
}

export function parsePublicKey(publicKeyJson: string | any) {
  const parsed = typeof publicKeyJson === "string" ? JSON.parse(publicKeyJson) : publicKeyJson;
  if (parsed.n) return parsed;
  if (parsed.public_key) return parsed.public_key;
  throw new Error("Unrecognized HE public key format");
}
