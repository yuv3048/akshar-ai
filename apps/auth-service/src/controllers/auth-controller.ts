import { Hono, type Context } from "hono";
import { createDb } from "@akshar/db";
import { loginSchema, resendOtpSchema, signupSchema, verifyEmailSchema } from "@akshar/validation";
import type { EMAILJOB } from "@akshar/email";
import { AppError } from "../errors/app-error.js";
import { signup } from "../services/signup.js";
import { verifyEmail } from "../services/verify-email.js";
import { resendVerificationOtp } from "../services/resend-otp.js";
import { login } from "../services/login.js";
import { AuthState } from "../state/auth-state.js";
import { verifySessionToken } from "../security/session-token.js";
import { userRepository } from "../repositories/user-repository.js";

export type AuthBindings = {
  DATABASE_URL: string;
  AUTH_EMAIL_QUEUE: Queue<EMAILJOB>;
  AUTH_STATE: DurableObjectNamespace;
  INTERNAL_GATEWAY_SECRET: string;
  AUTH_TOKEN_SECRET: string;
};
type AuthEnv = { Bindings: AuthBindings };
const controller = new Hono<AuthEnv>();

async function readJson(c: Context<AuthEnv>): Promise<unknown> {
  try { return await c.req.json(); }
  catch { throw new AppError("INVALID_JSON", "Request body must be valid JSON.", 400); }
}
function validationError(error: { issues: { path: PropertyKey[]; message: string }[] }) {
  return new AppError("VALIDATION_ERROR", "Please check the submitted details.", 400, {
    fields: error.issues.map(issue => ({ field: issue.path.map(String).join("."), message: issue.message })),
  });
}
function deps(c: Context<AuthEnv>) {
  return { db: createDb(c.env.DATABASE_URL), queue: c.env.AUTH_EMAIL_QUEUE, state: new AuthState(c.env.AUTH_STATE) };
}
function sessionCookie(c: Context<AuthEnv>): string | null {
  const cookie = c.req.header("cookie") ?? "";
  const entry = cookie.split(";").map(value => value.trim()).find(value => value.startsWith("akshar_session="));
  return entry ? decodeURIComponent(entry.slice("akshar_session=".length)) : null;
}

controller.post("/signup", async c => {
  const parsed = signupSchema.safeParse(await readJson(c));
  if (!parsed.success) throw validationError(parsed.error);
  const ip = c.req.header("x-client-ip");
  if (!ip || ip === "unknown") throw new AppError("AUTH_UNAVAILABLE", "Request could not be processed.", 400);
  const result = await signup(parsed.data, ip, deps(c));
  return c.json({ data: result, requestId: c.req.header("x-request-id") ?? crypto.randomUUID() }, result.status === "SIGNUP_RECOVERED" ? 200 : 202);
});

controller.post("/verify-email", async c => {
  const parsed = verifyEmailSchema.safeParse(await readJson(c));
  if (!parsed.success) throw validationError(parsed.error);
  const result = await verifyEmail(parsed.data, deps(c));
  return c.json({ data: result, requestId: c.req.header("x-request-id") ?? crypto.randomUUID() }, 200);
});

controller.post("/resend-otp", async c => {
  const parsed = resendOtpSchema.safeParse(await readJson(c));
  if (!parsed.success) throw validationError(parsed.error);
  const result = await resendVerificationOtp(parsed.data, deps(c));
  return c.json({ data: result, requestId: c.req.header("x-request-id") ?? crypto.randomUUID() }, 200);
});

controller.post("/login", async c => {
  const parsed = loginSchema.safeParse(await readJson(c));
  if (!parsed.success) throw validationError(parsed.error);
  const result = await login(parsed.data, {
    db: createDb(c.env.DATABASE_URL),
    tokenSecret: c.env.AUTH_TOKEN_SECRET,
    state: new AuthState(c.env.AUTH_STATE),
    queue: c.env.AUTH_EMAIL_QUEUE,
    ip: c.req.header("x-client-ip") ?? "unknown",
  });
  c.header("Set-Cookie", `akshar_session=${result.token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=900`);
  c.header("Cache-Control", "no-store");
  return c.json({ data: { user: result.user }, requestId: c.req.header("x-request-id") ?? crypto.randomUUID() }, 200);
});

controller.get("/me", async c => {
  const token = sessionCookie(c);
  const claims = token ? await verifySessionToken(token, c.env.AUTH_TOKEN_SECRET) : null;
  if (!claims) throw new AppError("INVALID_CREDENTIALS", "Please sign in to continue.", 401);
  const user = await userRepository.findByEmail(createDb(c.env.DATABASE_URL), claims.email).catch(() => null);
  if (!user || user.id !== claims.sub || !user.emailVerifiedAt) throw new AppError("INVALID_CREDENTIALS", "Please sign in to continue.", 401);
  c.header("Cache-Control", "no-store");
  return c.json({ data: { user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerifiedAt: user.emailVerifiedAt } } }, 200);
});

controller.post("/logout", c => {
  c.header("Set-Cookie", "akshar_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0");
  c.header("Cache-Control", "no-store");
  return c.json({ data: { status: "SIGNED_OUT" } }, 200);
});

export default controller;
