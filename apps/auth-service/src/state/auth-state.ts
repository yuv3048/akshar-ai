export interface AuthStateNamespace {
  idFromName(name: string): DurableObjectId;
  get(id: DurableObjectId): DurableObjectStub;
}

async function digestName(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, "0")).join("");
}

export class AuthState {
  constructor(private readonly namespace: AuthStateNamespace) {}

  private async call<T>(scope: string, body: Record<string, unknown>): Promise<T> {
    const name = await digestName(scope);
    const stub = this.namespace.get(this.namespace.idFromName(name));
    let response: Response;
    try {
      response = await stub.fetch("https://auth-state.internal/state", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
    } catch {
      throw new Error("AUTH_STATE_UNAVAILABLE");
    }
    if (!response.ok) throw new Error("AUTH_STATE_UNAVAILABLE");
    const payload = await response.json() as { result?: T };
    if (!("result" in payload)) throw new Error("AUTH_STATE_UNAVAILABLE");
    return payload.result as T;
  }

  get<T>(scope: string, key: string): Promise<T | null> {
    return this.call<T | null>(scope, { action: "get", key });
  }
  set(scope: string, key: string, value: unknown, ttlSeconds: number): Promise<boolean> {
    return this.call<boolean>(scope, { action: "set", key, value, ttlSeconds });
  }
  delete(scope: string, key: string): Promise<boolean> {
    return this.call<boolean>(scope, { action: "delete", key });
  }
  verifyOtp(scope: string, expectedHash: string) {
    return this.call<{ status: "VERIFIED" | "INVALID" | "EXPIRED" | "LOCKED" }>(scope, { action: "verify-otp", key: "otp", expectedHash });
  }
  reserveResend(scope: string) {
    return this.call<{ allowed: boolean; retryAfterSeconds: number; attempt: number }>(scope, { action: "reserve-resend", key: "resend" });
  }
  releaseResend(scope: string) {
    return this.call<boolean>(scope, { action: "release-resend", key: "resend" });
  }
  rateLimit(scope: string, item: string, limit = 5, windowSeconds = 3600) {
    return this.call<{ allowed: boolean; count: number }>(scope, { action: "rate-limit", key: "signup-rate", item, limit, windowSeconds });
  }
}
