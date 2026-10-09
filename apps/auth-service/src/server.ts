import dotenv from "dotenv";
import { serve } from "@hono/node-server";

dotenv.config();

const { default: app } = await import("./app.js");

serve({
  fetch: app.fetch,
  port: 4001,
});

console.log("Auth Service running on http://localhost:4001");