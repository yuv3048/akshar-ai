const encoder = new TextEncoder();
function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}
function encodeJson(value: unknown): string { return base64Url(encoder.encode(JSON.stringify(value))); }

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
