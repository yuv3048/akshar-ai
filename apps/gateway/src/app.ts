import { Hono } from "hono";

const app = new Hono();

const AUTH_SERVICE_URL =
  process.env.AUTH_SERVICE_URL ?? "http://localhost:4001";

app.get("/", (c) => {
  return c.json({
    service: "akshar-ai-gateway",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({ status: "healthy" });
});

app.post("/api/auth/signup", async (c) => {
  try {
    const response = await fetch(
      `${AUTH_SERVICE_URL}/api/auth/signup`,
      {
        method: "POST",
        headers: {
          "Content-Type": c.req.header("content-type") ?? "application/json",
        },
        body: await c.req.text(),
      },
    );

    return new Response(response.body, {
      status: response.status,
      headers: {
        "Content-Type":
          response.headers.get("content-type") ?? "application/json",
      },
    });
  } catch {
    return c.json(
      { error: "Authentication service is temporarily unavailable." },
      503,
    );
  }
});

export default app;