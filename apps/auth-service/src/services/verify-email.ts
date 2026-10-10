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
  if (!pending) throw new AppError("PENDING_SIGNUP_EXPIRED", "This signup has expired. Please sign up again.", 400);

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
    // OTP remains available on transient DB errors so the verification can be retried.
    throw new AppError("AUTH_UNAVAILABLE", "We verified the code but couldn't finish creating your account. Please retry shortly.", 503);
  }
  if (!user) throw new AppError("AUTH_UNAVAILABLE", "We couldn't finish creating your account. Please retry shortly.", 503);

  await deps.state.delete(scope, "otp");
  await deps.state.delete(scope, "pending-signup");

  // Welcome email is asynchronous. Account creation stays successful if the queue is down.
  let welcomeEmailQueued = true;
  try {
    await enqueueAuthEmail(deps.queue, { type: "WELCOME_EMAIL", email: user.email, fname: user.firstName });
  } catch {
    welcomeEmailQueued = false;
  }

  return {
    status: "EMAIL_VERIFIED" as const,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
    welcomeEmailQueued,
    message: welcomeEmailQueued
      ? "Your email is verified and your account is ready."
      : "Your email is verified and your account is ready. The welcome email could not be queued, but you can sign in.",
  };
}
