import type { SignupInput } from "@akshar/validation";
import type { Database } from "@akshar/db";
import type { EmailQueue } from "../queues/email.queue.js";
import { enqueueAuthEmail } from "../queues/email.queue.js";
import { userRepository } from "../repositories/user-repository.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { generateOtp, hashOtp } from "../security/otp.js";
import { AuthState } from "../state/auth-state.js";
import { AppError } from "../errors/app-error.js";

type PendingSignup = { firstName: string; lastName?: string; email: string; passwordHash: string; signupIp: string };

export async function signup(input: SignupInput, ip: string, deps: { db: Database; queue: EmailQueue; state: AuthState }) {
  const email = input.email.trim().toLowerCase();
  let existingUser;
  try { existingUser = await userRepository.findByEmail(deps.db, email); }
  catch { throw new AppError("AUTH_UNAVAILABLE", "Signup is temporarily unavailable.", 503); }
  if (existingUser) throw new AppError("EMAIL_EXISTS", "An account with this email already exists.", 409);

  const scope = `email:${email}`;
  let existingPendingSignup: PendingSignup | null;
  try { existingPendingSignup = await deps.state.get<PendingSignup>(scope, "pending-signup"); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Signup is temporarily unavailable.", 503); }
  if (existingPendingSignup) {
    const matches = await verifyPassword(input.password, existingPendingSignup.passwordHash);
    if (!matches) throw new AppError("INVALID_PENDING_CREDENTIALS", "Signup is already in progress for this email. Check the details and try again.", 400);
    return { status: "SIGNUP_RECOVERED" as const, message: "Signup is already in progress. If the code did not arrive, request another one." };
  }

  try {
    const limit = await deps.state.rateLimit(`ip:${ip}`, email, 5, 3600);
    if (!limit.allowed) throw new AppError("RATE_LIMITED", "Too many signup attempts. Please try again later.", 429);
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError("STATE_UNAVAILABLE", "Signup is temporarily unavailable.", 503);
  }

  const passwordHash = await hashPassword(input.password);
  const pendingSignup = { firstName: input.fname, lastName: input.lname, email, passwordHash, signupIp: ip };
  try { await deps.state.set(scope, "pending-signup", pendingSignup, 3600); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Signup is temporarily unavailable.", 503); }

  const otp = generateOtp();
  try { await deps.state.set(scope, "otp", { otpHash: await hashOtp(otp), attempts: 0, lockedUntil: null }, 420); }
  catch { throw new AppError("STATE_UNAVAILABLE", "Signup is temporarily unavailable.", 503); }

  try { await enqueueAuthEmail(deps.queue, { type: "VERIFY_EMAIL", email, otp }); }
  catch {
    // Keep the pending signup and OTP so the user can recover via the resend endpoint.
    throw new AppError("QUEUE_UNAVAILABLE", "We couldn't queue your verification email. Please try again shortly.", 503);
  }

  return { status: "VERIFICATION_EMAIL_QUEUED" as const, message: "If this address can receive email, a verification code should arrive shortly. Check your spam folder too." };
}
