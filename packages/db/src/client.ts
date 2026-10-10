import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema/index.js";

export function createDb(connectionString: string) {
  if (!connectionString) throw new Error("DATABASE_URL is not configured");
  const sql = neon(connectionString);
  return drizzle({ client: sql, schema });
}
