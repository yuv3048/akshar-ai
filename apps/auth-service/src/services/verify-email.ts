import type { Database } from "@akshar/db";
import type { VerifyEmailInput } from "@akshar/validation";
import type { EmailQueue } from "../queues/email.queue.js";
import { enqueueAuthEmail } from "../queues/email.queue.js";
import { userRepository } from "../repositories/user-repository.js";
import { hashOtp } from "../security/otp.js";
import { AuthState } from "../state/auth-state.js";
import { AppError } from "../errors/app-error.js";

type PendingSignup = { firstName: string; lastName?: string; email: string; passwordHash: string; signupIp: string };

export async function verifyEmail(input: VerifyEmailInput, deps: { db: Database; queue: EmailQueue; state: AuthState }) {
  const email = input.email.trim().toLowerCase();
  const scope = `email:${email}`;
  let pending: PendingSignup | null;
  try { pending = await deps.state.get<PendingSignup>(scope, "pending-signup"); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Verification is temporarily unavailable.", 503); }
  if (!pending) {
    const existing = await userRepository.findByEmail(deps.db, email).catch(() => null);
    if (existing?.emailVerifiedAt) return { status: "EMAIL_ALREADY_VERIFIED" as const, user: { id: existing.id, email: existing.email }, welcomeEmailQueued: true };
    throw new AppError("PENDING_SIGNUP_EXPIRED", "This signup has expired. Please sign up again.", 400);
  }

  let verification;
  try { verification = await deps.state.verifyOtp(scope, await hashOtp(input.otp)); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Verification is temporarily unavailable.", 503); }
  if (verification.status === "LOCKED") throw new AppError("OTP_LOCKED", "Too many incorrect codes. Try again in 30 minutes.", 429);
  if (verification.status === "EXPIRED") throw new AppError("OTP_EXPIRED", "This code has expired. Request a new code.", 400);
  if (verification.status === "INVALID") throw new AppError("OTP_INVALID", "That code is incorrect.", 400);

  let user;
  try {
    user = await userRepository.createVerifiedUser(deps.db, {
      firstName: pending.firstName,
      lastName: pending.lastName,
      email: pending.email,
      passwordHash: pending.passwordHash,
    });
  } catch {
    throw new AppError("AUTH_UNAVAILABLE", "We verified the code but couldn't finish creating your account. Please retry shortly.", 503);
  }
  if (!user) throw new AppError("AUTH_UNAVAILABLE", "We couldn't finish creating your account. Please retry shortly.", 503);

  const welcomeJob = { type: "WELCOME_EMAIL" as const, email: user.email, fname: user.firstName };
  try { await deps.state.set(scope, "welcome-email-pending", welcomeJob, 7 * 24 * 3600); } catch { /* queue attempt still proceeds */ }
  await deps.state.delete(scope, "otp");
  await deps.state.delete(scope, "pending-signup");

  let welcomeEmailQueued = false;
  try {
    await enqueueAuthEmail(deps.queue, welcomeJob);
    welcomeEmailQueued = true;
    await deps.state.delete(scope, "welcome-email-pending");
  } catch { /* the job remains in Durable Object state for a later login retry */ }

  return {
    status: "EMAIL_VERIFIED" as const,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
    welcomeEmailQueued,
    message: welcomeEmailQueued
      ? "Your email is verified and your account is ready."
      : "Your email is verified and your account is ready. We'll retry the welcome email when you sign in.",
  };
}
