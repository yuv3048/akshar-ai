const encoder = new TextEncoder();
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encodeJson(value: unknown): string { return base64Url(encoder.encode(JSON.stringify(value))); }
function decodeBase64Url(value: string): Uint8Array {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - normalized.length % 4) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, char => char.charCodeAt(0));
}

export type SessionClaims = { sub: string; email: string; iat: number; exp: number; iss: "akshar-ai" };

export async function createSessionToken(user: { id: string; email: string }, secret: string): Promise<string> {
  if (!secret || secret.length < 32) throw new Error("AUTH_TOKEN_SECRET must be at least 32 characters");
  const now = Math.floor(Date.now() / 1000);
  const header = encodeJson({ alg: "HS256", typ: "JWT" });
  const payload = encodeJson({ sub: user.id, email: user.email, iat: now, exp: now + 15 * 60, iss: "akshar-ai" });
  const unsigned = `${header}.${payload}`;
  const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(unsigned));
  return `${unsigned}.${base64Url(new Uint8Array(signature))}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<SessionClaims | null> {
  if (!secret || secret.length < 32) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some(part => !part)) return null;
  try {
    const [encodedHeader, encodedPayload, encodedSignature] = parts as [string, string, string];
    const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedHeader))) as { alg?: string; typ?: string };
    const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(encodedPayload))) as Partial<SessionClaims>;
    if (header.alg !== "HS256" || header.typ !== "JWT") return null;
    const key = await crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["verify"]);
    const valid = await crypto.subtle.verify("HMAC", key, decodeBase64Url(encodedSignature), encoder.encode(`${encodedHeader}.${encodedPayload}`));
    if (!valid || payload.iss !== "akshar-ai" || typeof payload.sub !== "string" || typeof payload.email !== "string" ||
        typeof payload.exp !== "number" || payload.exp <= Math.floor(Date.now() / 1000) ||
        typeof payload.iat !== "number" || payload.iat > Math.floor(Date.now() / 1000) + 60) return null;
    return payload as SessionClaims;
  } catch { return null; }
}
