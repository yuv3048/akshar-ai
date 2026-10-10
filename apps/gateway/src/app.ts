import { Hono } from "hono";

type Bindings = {
  AUTH_SERVICE: Fetcher;
};

type Variables = {
  clientIp: string;
  requestId: string;
};

const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  c.set("requestId", c.req.header("cf-ray") ?? crypto.randomUUID());
  // Cloudflare overwrites CF-Connecting-IP at its edge. Do not trust arbitrary
  // X-Forwarded-For values supplied by clients.
  c.set("clientIp", c.req.header("cf-connecting-ip") ?? "unknown");
  await next();
});

app.get("/", (c) => c.json({ service: "akshar-ai-gateway", status: "ok" }));
app.get("/health", (c) => c.json({ status: "healthy" }));

app.post("/api/auth/signup", async (c) => {
  try {
    const response = await c.env.AUTH_SERVICE.fetch(
      new Request("https://auth-service.internal/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": c.req.header("content-type") ?? "application/json",
          "X-Request-ID": c.get("requestId"),
          "CF-Connecting-IP": c.get("clientIp"),
        },
        body: await c.req.text(),
      }),
    );
    const headers = new Headers();
    const contentType = response.headers.get("content-type");
    if (contentType) headers.set("content-type", contentType);
    headers.set("cache-control", "no-store");
    headers.set("x-request-id", c.get("requestId"));
    return new Response(response.body, { status: response.status, headers });
  } catch {
    return c.json(
      { error: { code: "AUTH_SERVICE_UNAVAILABLE", message: "Signup is temporarily unavailable. Please try again shortly." }, requestId: c.get("requestId") },
      503,
    );
  }
});

export default app;
