import { Redis } from "@upstash/redis";

let client: Redis | undefined;

export function configureRedis(url: string, token: string): void {
  if (!url || !token) throw new Error("Upstash state-store bindings are not configured");
  client = new Redis({ url, token });
}

function getClient(): Redis {
  if (!client) throw new Error("State store has not been configured for this request");
  return client;
}

// Keep the existing state repositories working while removing process.env access
// from module initialization, which is unavailable in the Workers runtime.
export const redis = new Proxy({} as Redis, {
  get(_target, property) {
    if (property === "createScript") {
      return (script: string) => ({
        exec: (...args: unknown[]) => {
          const current = getClient() as unknown as { createScript: (s: string) => { exec: (...a: unknown[]) => Promise<unknown> } };
          return current.createScript(script).exec(...args);
        },
      });
    }
    const value = (getClient() as unknown as Record<PropertyKey, unknown>)[property];
    return typeof value === "function" ? value.bind(getClient()) : value;
  },
});
