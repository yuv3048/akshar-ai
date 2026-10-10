const ITERATIONS = 600_000;
const KEY_LENGTH = 256;
const SALT_LENGTH = 16;
const encoder = new TextEncoder();

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function fromBase64(value: string): Uint8Array {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function derive(password: string, salt: Uint8Array, iterations: number, length: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations, hash: "SHA-256" }, key, length);
  return new Uint8Array(bits);
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
  const hash = await derive(password, salt, ITERATIONS, KEY_LENGTH);
  return ["pbkdf2", "sha256", ITERATIONS, toBase64(salt), toBase64(hash)].join("$");
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const parts = storedHash.split("$");
  if (parts.length !== 5) return false;
  const [algorithm, hashAlgorithm, iterationsString, saltBase64, hashBase64] = parts;
  if (algorithm !== "pbkdf2" || hashAlgorithm !== "sha256" || !saltBase64 || !hashBase64) return false;

  const iterations = Number(iterationsString);
  if (!Number.isSafeInteger(iterations) || iterations < 100_000 || iterations > 2_000_000) return false;

  let salt: Uint8Array;
  let expected: Uint8Array;
  try {
    salt = fromBase64(saltBase64);
    expected = fromBase64(hashBase64);
  } catch {
    return false;
  }
  if (salt.length !== SALT_LENGTH || expected.length === 0) return false;

  const actual = await derive(password, salt, iterations, expected.length * 8);
  if (actual.length !== expected.length) return false;
  let difference = 0;
  for (let i = 0; i < actual.length; i++) difference |= (actual[i] ?? 0) ^ (expected[i] ?? 0);
  return difference === 0;
}
