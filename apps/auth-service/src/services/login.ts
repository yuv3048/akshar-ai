import type { Database } from "@akshar/db";
import type { LoginInput } from "@akshar/validation";
import type { EmailQueue } from "../queues/email.queue.js";
import { enqueueAuthEmail } from "../queues/email.queue.js";
import { userRepository } from "../repositories/user-repository.js";
import { verifyPassword } from "../security/password.js";
import { createSessionToken } from "../security/session-token.js";
import { AuthState } from "../state/auth-state.js";
import { AppError } from "../errors/app-error.js";

export async function login(
  input: LoginInput,
  deps: { db: Database; tokenSecret: string; state: AuthState; queue: EmailQueue; ip: string },
) {
  const email = input.email.trim().toLowerCase();
  try {
    const ipLimit = await deps.state.rateLimit(`login-ip:${deps.ip}`, crypto.randomUUID(), 10, 900);
    const emailLimit = await deps.state.rateLimit(`login-email:${email}`, crypto.randomUUID(), 5, 900);
    if (!ipLimit.allowed || !emailLimit.allowed) {
      throw new AppError("RATE_LIMITED", "Too many sign-in attempts. Please wait and try again.", 429);
    }
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("STATE_UNAVAILABLE", "Sign in is temporarily unavailable.", 503);
  }

  let user;
  try { user = await userRepository.findByEmail(deps.db, email); }
  catch { throw new AppError("AUTH_UNAVAILABLE", "Sign in is temporarily unavailable.", 503); }

  if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) {
    throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  }
  if (!user.emailVerifiedAt) throw new AppError("EMAIL_NOT_VERIFIED", "Please verify your email before signing in.", 403);

  let token: string;
  try { token = await createSessionToken({ id: user.id, email: user.email }, deps.tokenSecret); }
  catch { throw new AppError("AUTH_UNAVAILABLE", "Sign in is temporarily unavailable.", 503); }

  // Best-effort delivery retry for a welcome email that could not be queued after verification.
  try {
    const scope = `email:${email}`;
    const pendingWelcome = await deps.state.get<{ type: "WELCOME_EMAIL"; email: string; fname: string }>(scope, "welcome-email-pending");
    if (pendingWelcome) {
      await enqueueAuthEmail(deps.queue, pendingWelcome);
      await deps.state.delete(scope, "welcome-email-pending");
    }
  } catch { /* login must not fail because a welcome email is temporarily unavailable */ }

  return {
    token,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
  };
}
