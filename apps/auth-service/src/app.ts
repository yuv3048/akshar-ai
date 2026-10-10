import { Hono } from "hono";
import type { EMAILJOB } from "@akshar/email";
import authController from "./controllers/auth-controller.js";
import { errorHandler } from "./middleware/error-handler.js";
import { AppError } from "./errors/app-error.js";
import { AuthStateDO } from "./state/auth-state-do.js";

interface Env {
  Bindings: {
    DATABASE_URL: string;
    AUTH_EMAIL_QUEUE: Queue<EMAILJOB>;
    AUTH_STATE: DurableObjectNamespace;
    INTERNAL_GATEWAY_SECRET: string;
    AUTH_TOKEN_SECRET: string;
  };
}

const app = new Hono<Env>();
app.onError(errorHandler);
app.get("/", c => c.json({ service: "akshar-ai-auth-service", status: "ok" }));
app.get("/health", c => c.json({ status: "healthy" }));

app.use("/api/auth/*", async (c, next) => {
  const requestId = c.req.header("x-request-id") ?? crypto.randomUUID();
  c.header("x-request-id", requestId);
  c.header("cache-control", "no-store");
  if (!c.env.INTERNAL_GATEWAY_SECRET || c.req.header("x-akshar-gateway-secret") !== c.env.INTERNAL_GATEWAY_SECRET) {
    throw new AppError("FORBIDDEN", "This endpoint is not directly accessible.", 403);
  }
  await next();
});
app.route("/api/auth", authController);

export { AuthStateDO };
export default app;
