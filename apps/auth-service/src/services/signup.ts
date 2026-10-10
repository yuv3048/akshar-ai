import type { SignupInput } from "@akshar/validation";
import type { Database } from "@akshar/db";
import type { EmailQueue } from "../queues/email.queue.js";
import { enqueueAuthEmail } from "../queues/email.queue.js";
import { userRepository } from "../repositories/user-repository.js";
import { signupRateLimit } from "../redis/signup-rate-limit.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { generateOtp, hashOtp } from "../security/otp.js";
import { emailOtp } from "../redis/email-otp.js";
import { pendingSignup } from "../redis/pending-signup.js";

export class SignupError extends Error {
  constructor(public readonly code: "EMAIL_EXISTS" | "INVALID_PENDING_CREDENTIALS" | "RATE_LIMITED" | "QUEUE_UNAVAILABLE" | "STATE_UNAVAILABLE", message: string) {
    super(message);
    this.name = "SignupError";
  }
}

export async function signup(
  input: SignupInput,
  ip: string,
  deps: { db: Database; queue: EmailQueue },
) {
  const email = input.email.trim().toLowerCase();

  let existingUser;
  try {
    existingUser = await userRepository.findByEmail(deps.db, email);
  } catch {
    throw new SignupError("STATE_UNAVAILABLE", "Signup is temporarily unavailable. Please try again shortly.");
  }
  if (existingUser) throw new SignupError("EMAIL_EXISTS", "An account with this email already exists.");

  let existingPendingSignup;
  try {
    existingPendingSignup = await pendingSignup.get(email);
  } catch {
    throw new SignupError("STATE_UNAVAILABLE", "Signup is temporarily unavailable. Please try again shortly.");
  }
  if (existingPendingSignup) {
    const matches = await verifyPassword(input.password, existingPendingSignup.passwordHash);
    if (!matches) throw new SignupError("INVALID_PENDING_CREDENTIALS", "Signup is already in progress for this email. Check the details and try again.");
    return { status: "SIGNUP_RECOVERED" as const, message: "Signup is already in progress. Request a new code if needed." };
  }

  let rateLimit;
  try {
    rateLimit = await signupRateLimit.check(ip, email);
  } catch {
    throw new SignupError("STATE_UNAVAILABLE", "Signup is temporarily unavailable. Please try again shortly.");
  }
  if (rateLimit.status === "LIMITED") throw new SignupError("RATE_LIMITED", "Too many signup attempts. Please try again later.");

  const passwordHash = await hashPassword(input.password);
  try {
    await pendingSignup.create({ firstName: input.fname, lastName: input.lname, email, passwordHash, signupIp: ip });
  } catch {
    try { await signupRateLimit.release(ip, email); } catch { /* preserve original failure */ }
    throw new SignupError("STATE_UNAVAILABLE", "Signup is temporarily unavailable. Please try again shortly.");
  }

  const otp = generateOtp();
  try {
    await emailOtp.create(email, await hashOtp(otp));
  } catch {
    try { await pendingSignup.delete(email); } catch { /* best-effort cleanup */ }
    try { await signupRateLimit.release(ip, email); } catch { /* best-effort cleanup */ }
    throw new SignupError("STATE_UNAVAILABLE", "Signup is temporarily unavailable. Please try again shortly.");
  }

  try {
    await enqueueAuthEmail(deps.queue, { type: "VERIFY_EMAIL", email, otp });
  } catch {
    // Keep the pending signup and OTP so a retry can recover; never expose queue details.
    throw new SignupError("QUEUE_UNAVAILABLE", "We couldn't queue your verification email right now. Please try again shortly.");
  }

  return { status: "VERIFICATION_EMAIL_QUEUED" as const, message: "If the address can receive email, a verification code should arrive shortly. Check your spam folder too." };
}
