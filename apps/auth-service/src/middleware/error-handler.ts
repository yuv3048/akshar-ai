import type { ErrorHandler } from "hono";
import { AppError } from "../errors/app-error.js";

export const errorHandler: ErrorHandler = (error, c) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  if (error instanceof AppError) {
    const headers: Record<string, string> = { "cache-control": "no-store", "x-request-id": requestId };
    if (error.code === "RESEND_COOLDOWN" && typeof error.details?.retryAfterSeconds === "number") {
      headers["retry-after"] = String(error.details.retryAfterSeconds);
    }
    return c.json({
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
      requestId,
    }, error.status as 400 | 401 | 403 | 404 | 409 | 429 | 503, headers);
  }
  console.error("Auth request failed", { requestId, category: "UNEXPECTED_ERROR" });
  return c.json({
    error: { code: "AUTH_UNAVAILABLE", message: "The request could not be completed. Please try again shortly." },
    requestId,
  }, 503);
};
