export type AppErrorCode =
  | "EMAIL_EXISTS" | "INVALID_PENDING_CREDENTIALS" | "RATE_LIMITED" | "QUEUE_UNAVAILABLE"
  | "STATE_UNAVAILABLE" | "OTP_INVALID" | "OTP_EXPIRED" | "OTP_LOCKED" | "PENDING_SIGNUP_EXPIRED"
  | "RESEND_COOLDOWN" | "INVALID_CREDENTIALS" | "EMAIL_NOT_VERIFIED" | "AUTH_UNAVAILABLE"
  | "VALIDATION_ERROR" | "INVALID_JSON" | "FORBIDDEN" | "NOT_FOUND";

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status: number,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "AppError";
  }
}
