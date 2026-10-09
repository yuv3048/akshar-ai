import { serve } from "@hono/node-server";
import app from "./app.js";

serve({
  fetch: app.fetch,
  port: 4000,
});

console.log("Gateway running on http://localhost:4000");