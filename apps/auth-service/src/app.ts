import { createDb } from "@akshar/db";
import { configureRedis } from "@akshar/redis";
import type { EMAILJOB } from "@akshar/email";
import { signupSchema } from "@akshar/validation";
import { Hono } from "hono";
import { SignupError, signup } from "./services/signup.js";

interface Env {
  Bindings: {
    DATABASE_URL: string;
    AUTH_EMAIL_QUEUE: Queue<EMAILJOB>;
    UPSTASH_REDIS_REST_URL: string;
    UPSTASH_REDIS_REST_TOKEN: string;
    INTERNAL_GATEWAY_SECRET: string;
  };
}

const app = new Hono<Env>();

app.get("/", (c) => c.json({ service: "akshar-ai-auth-service", status: "ok" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

app.post("/api/auth/signup", async (c) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  if (c.req.header("x-akshar-gateway-secret") !== c.env.INTERNAL_GATEWAY_SECRET) {
    return c.json({ error: { code: "FORBIDDEN", message: "This endpoint is not directly accessible." }, requestId }, 403);
  }

  let body: unknown;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: { code: "INVALID_JSON", message: "Request body must be valid JSON." }, requestId }, 400);
  }

  const parsed = signupSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({
      error: {
        code: "VALIDATION_ERROR",
        message: "Please check the signup details and try again.",
        fields: parsed.error.issues.map((issue) => ({ field: issue.path.join("."), message: issue.message })),
      },
      requestId,
    }, 400);
  }

  try {
    configureRedis(c.env.UPSTASH_REDIS_REST_URL, c.env.UPSTASH_REDIS_REST_TOKEN);
    const result = await signup(parsed.data, c.req.header("x-client-ip") ?? "unknown", {
      db: createDb(c.env.DATABASE_URL),
      queue: c.env.AUTH_EMAIL_QUEUE,
    });
    return c.json({ data: result, requestId }, result.status === "SIGNUP_RECOVERED" ? 200 : 202);
  } catch (error) {
    if (error instanceof SignupError) {
      const status = error.code === "EMAIL_EXISTS" ? 409
        : error.code === "INVALID_PENDING_CREDENTIALS" ? 400
        : error.code === "RATE_LIMITED" ? 429
        : error.code === "QUEUE_UNAVAILABLE" ? 503
        : 503;
      return c.json({ error: { code: error.code, message: error.message }, requestId }, status);
    }
    // Never log credentials, OTPs, request bodies, or provider responses.
    console.error("Signup request failed", { requestId, category: "UNEXPECTED_ERROR" });
    return c.json({ error: { code: "SIGNUP_UNAVAILABLE", message: "Signup is temporarily unavailable. Please try again shortly." }, requestId }, 503);
  }
});

export default app;
