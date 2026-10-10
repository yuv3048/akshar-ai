export function generateOtp(): string {
  const random = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  // Rejection sampling avoids modulo bias for a six-digit code.
  const limit = Math.floor(0x1_0000_0000 / 1_000_000) * 1_000_000;
  let value = random;
  while (value >= limit) value = crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  return String(value % 1_000_000).padStart(6, "0");
}

export async function hashOtp(otp: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(otp));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}
