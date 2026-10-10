import type { Database } from "@akshar/db";
import type { LoginInput } from "@akshar/validation";
import { userRepository } from "../repositories/user-repository.js";
import { verifyPassword } from "../security/password.js";
import { createSessionToken } from "../security/session-token.js";
import { AppError } from "../errors/app-error.js";

export async function login(input: LoginInput, deps: { db: Database; tokenSecret: string }) {
  let user;
  try { user = await userRepository.findByEmail(deps.db, input.email.trim().toLowerCase()); }
  catch { throw new AppError("AUTH_UNAVAILABLE", "Sign in is temporarily unavailable.", 503); }

  if (!user?.passwordHash || !await verifyPassword(input.password, user.passwordHash)) {
    throw new AppError("INVALID_CREDENTIALS", "Email or password is incorrect.", 401);
  }
  if (!user.emailVerifiedAt) throw new AppError("EMAIL_NOT_VERIFIED", "Please verify your email before signing in.", 403);

  let token: string;
  try { token = await createSessionToken({ id: user.id, email: user.email }, deps.tokenSecret); }
  catch { throw new AppError("AUTH_UNAVAILABLE", "Sign in is temporarily unavailable.", 503); }

  return {
    token,
    user: { id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, emailVerifiedAt: user.emailVerifiedAt },
  };
}
