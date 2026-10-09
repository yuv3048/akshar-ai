import { Hono } from "hono";

const app = new Hono();

app.get("/", (c) => {
  return c.json({
    service: "akshar-ai-gateway",
    status: "ok",
  });
});

app.get("/health", (c) => {
  return c.json({
    status: "healthy",
  });
});

export default app;