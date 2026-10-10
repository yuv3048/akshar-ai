import { Hono } from "hono";

type Bindings = { AUTH_SERVICE: Fetcher; INTERNAL_GATEWAY_SECRET: string };
type Variables = { clientIp: string; requestId: string };
const app = new Hono<{ Bindings: Bindings; Variables: Variables }>();

app.use("*", async (c, next) => {
  c.set("requestId", c.req.header("x-request-id") ?? c.req.header("cf-ray") ?? crypto.randomUUID());
  c.set("clientIp", c.req.header("cf-connecting-ip") ?? "unknown");
  await next();
});

app.get("/", c => c.json({ service: "akshar-ai-gateway", status: "ok" }));
app.get("/health", c => c.json({ status: "healthy" }));

app.all("/api/auth/*", async c => {
  const method = c.req.method;
  const headers = new Headers();
  const contentType = c.req.header("content-type");
  if (contentType) headers.set("content-type", contentType);
  headers.set("X-Request-ID", c.get("requestId"));
  headers.set("X-Akshar-Gateway-Secret", c.env.INTERNAL_GATEWAY_SECRET);
  headers.set("X-Client-IP", c.get("clientIp"));
  const target = new URL(c.req.url);
  target.hostname = "auth-service.internal";
  target.protocol = "https:";
  try {
    const response = await c.env.AUTH_SERVICE.fetch(new Request(target, {
      method,
      headers,
      body: method === "GET" || method === "HEAD" ? undefined : await c.req.text(),
    }));
    const outgoing = new Headers();
    for (const name of ["content-type", "cache-control", "x-request-id", "set-cookie", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) outgoing.set(name, value);
    }
    outgoing.set("cache-control", "no-store");
    outgoing.set("x-request-id", c.get("requestId"));
    return new Response(response.body, { status: response.status, headers: outgoing });
  } catch {
    return c.json({
      error: { code: "AUTH_SERVICE_UNAVAILABLE", message: "Authentication is temporarily unavailable. Please try again shortly." },
      requestId: c.get("requestId"),
    }, 503);
  }
});

app.notFound(c => c.json({ error: { code: "NOT_FOUND", message: "Route not found." }, requestId: c.get("requestId") }, 404));
export default app;
