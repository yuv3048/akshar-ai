import type { ResendOtpInput } from "@akshar/validation";
import type { Database } from "@akshar/db";
import type { EmailQueue } from "../queues/email.queue.js";
import { enqueueAuthEmail } from "../queues/email.queue.js";
import { userRepository } from "../repositories/user-repository.js";
import { generateOtp, hashOtp } from "../security/otp.js";
import { AuthState } from "../state/auth-state.js";
import { AppError } from "../errors/app-error.js";

type PendingSignup = { firstName: string; lastName?: string; email: string; passwordHash: string; signupIp: string };

export async function resendVerificationOtp(input: ResendOtpInput, deps: { db: Database; queue: EmailQueue; state: AuthState }) {
  const email = input.email.trim().toLowerCase();
  try {
    const existing = await userRepository.findByEmail(deps.db, email);
    if (existing?.emailVerifiedAt) return { status: "ALREADY_VERIFIED" as const, message: "This email is already verified. You can sign in." };
  } catch { throw new AppError("AUTH_UNAVAILABLE", "We couldn't process the request. Please try again shortly.", 503); }

  const scope = `email:${email}`;
  let pending: PendingSignup | null;
  try { pending = await deps.state.get<PendingSignup>(scope, "pending-signup"); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Resend is temporarily unavailable.", 503); }
  if (!pending) return { status: "RESEND_IF_PENDING" as const, message: "If signup is still pending for this email, a new code may be sent." };

  let reservation;
  try { reservation = await deps.state.reserveResend(scope); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Resend is temporarily unavailable.", 503); }
  if (!reservation.allowed) {
    throw new AppError("RESEND_COOLDOWN", "Please wait before requesting another code.", 429, { retryAfterSeconds: reservation.retryAfterSeconds });
  }

  const otp = generateOtp();
  try {
    await deps.state.set(scope, "otp", { otpHash: await hashOtp(otp), attempts: 0, lockedUntil: null }, 420);
    await enqueueAuthEmail(deps.queue, { type: "VERIFY_EMAIL", email, otp });
  } catch {
    try { await deps.state.releaseResend(scope); } catch { /* best-effort compensation */ }
    throw new AppError("QUEUE_UNAVAILABLE", "We couldn't queue the verification email. Please try again shortly.", 503);
  }
  return { status: "VERIFICATION_EMAIL_QUEUED" as const, message: "If the address can receive email, a new verification code should arrive shortly." };
}
