type StoredValue = { value: unknown; expiresAt: number };
type ResendState = { sentAt: number[]; lastSentAt: number | null };
type OtpState = { otpHash: string; attempts: number; lockedUntil: number | null };

export class AuthStateDO {
  private storage: DurableObjectStorage;
  constructor(state: DurableObjectState) { this.storage = state.storage; }

  async fetch(request: Request): Promise<Response> {
    if (request.method !== "POST") return Response.json({ error: "METHOD_NOT_ALLOWED" }, { status: 405 });
    let body: Record<string, unknown>;
    try { body = await request.json() as Record<string, unknown>; }
    catch { return Response.json({ error: "INVALID_JSON" }, { status: 400 }); }
    try { return Response.json({ result: await this.dispatch(body) }); }
    catch { return Response.json({ error: "STATE_OPERATION_FAILED" }, { status: 500 }); }
  }

  private async dispatch(body: Record<string, unknown>): Promise<unknown> {
    const action = body.action;
    const key = typeof body.key === "string" ? body.key : "";
    if (action === "get") return this.read(key);
    if (action === "set") {
      if (!key || typeof body.ttlSeconds !== "number" || body.ttlSeconds < 1) throw new Error("INVALID_INPUT");
      await this.storage.put(key, { value: body.value, expiresAt: Date.now() + body.ttlSeconds * 1000 } satisfies StoredValue);
      return true;
    }
    if (action === "delete") { await this.storage.delete(key); return true; }
    if (action === "verify-otp") return this.verifyOtp(key, String(body.expectedHash ?? ""));
    if (action === "reserve-resend") return this.reserveResend(key);
    if (action === "release-resend") return this.releaseResend(key);
    if (action === "rate-limit") return this.rateLimit(key, String(body.item ?? ""), Number(body.limit ?? 5), Number(body.windowSeconds ?? 3600));
    throw new Error("UNKNOWN_ACTION");
  }

  private async read(key: string): Promise<unknown | null> {
    const stored = await this.storage.get<StoredValue>(key);
    if (!stored) return null;
    if (stored.expiresAt <= Date.now()) { await this.storage.delete(key); return null; }
    return stored.value;
  }

  private async verifyOtp(key: string, expectedHash: string): Promise<{ status: "VERIFIED" | "INVALID" | "EXPIRED" | "LOCKED" }> {
    return this.storage.transaction(async txn => {
      const stored = await txn.get<StoredValue>(key);
      if (!stored || stored.expiresAt <= Date.now()) {
        await txn.delete(key);
        return { status: "EXPIRED" as const };
      }
      const otp = stored.value as OtpState;
      if (otp.lockedUntil && otp.lockedUntil > Date.now()) return { status: "LOCKED" as const };
      if (otp.otpHash === expectedHash) return { status: "VERIFIED" as const };
      otp.attempts += 1;
      if (otp.attempts >= 5) otp.lockedUntil = Date.now() + 30 * 60 * 1000;
      await txn.put(key, { value: otp, expiresAt: stored.expiresAt });
      return { status: otp.lockedUntil ? "LOCKED" as const : "INVALID" as const };
    });
  }

  private async reserveResend(key: string): Promise<{ allowed: boolean; retryAfterSeconds: number; attempt: number }> {
    return this.storage.transaction(async txn => {
      const now = Date.now();
      const stored = await txn.get<StoredValue>(key);
      const state: ResendState = stored && stored.expiresAt > now ? stored.value as ResendState : { sentAt: [], lastSentAt: null };
      state.sentAt = state.sentAt.filter(t => now - t < 60 * 60 * 1000);
      const attempt = state.sentAt.length + 1;
      const cooldown = Math.min(60 * Math.pow(2, Math.max(0, attempt - 1)), 600);
      if (state.lastSentAt !== null && now - state.lastSentAt < cooldown * 1000) {
        return { allowed: false, retryAfterSeconds: Math.ceil((cooldown * 1000 - (now - state.lastSentAt)) / 1000), attempt };
      }
      if (state.sentAt.length >= 6) {
        const oldest = state.sentAt[0] ?? now;
        return { allowed: false, retryAfterSeconds: Math.max(1, Math.ceil((oldest + 3600000 - now) / 1000)), attempt };
      }
      state.sentAt.push(now);
      state.lastSentAt = now;
      await txn.put(key, { value: state, expiresAt: now + 3600000 });
      return { allowed: true, retryAfterSeconds: 0, attempt };
    });
  }

  private async releaseResend(key: string): Promise<boolean> {
    return this.storage.transaction(async txn => {
      const stored = await txn.get<StoredValue>(key);
      if (!stored || stored.expiresAt <= Date.now()) return false;
      const state = stored.value as ResendState;
      state.sentAt.pop();
      state.lastSentAt = state.sentAt.length ? state.sentAt[state.sentAt.length - 1] ?? null : null;
      await txn.put(key, { value: state, expiresAt: stored.expiresAt });
      return true;
    });
  }

  private async rateLimit(key: string, item: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; count: number }> {
    return this.storage.transaction(async txn => {
      const now = Date.now();
      const stored = await txn.get<StoredValue>(key);
      const value = stored && stored.expiresAt > now ? stored.value as { items: { id: string; at: number }[] } : { items: [] };
      value.items = value.items.filter(entry => now - entry.at < windowSeconds * 1000 && entry.id !== item);
      if (value.items.length >= limit) return { allowed: false, count: value.items.length };
      value.items.push({ id: item, at: now });
      await txn.put(key, { value, expiresAt: now + windowSeconds * 1000 });
      return { allowed: true, count: value.items.length };
    });
  }
}
