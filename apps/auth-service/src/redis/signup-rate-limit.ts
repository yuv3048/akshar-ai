import { redis } from "@akshar/redis";
import { redisKeys } from "./keys.js";

const MAX_SIGNUPS_PER_IP = 5;
const SIGNUP_RATE_LIMIT_TTL = 60*60;

const signupRateLimitScript = `

local key = KEYS[1]
local email = ARGV[1]
local max_signups = tonumber(ARGV[2])
local ttl = tonumber(ARGV[3])

-- Check whether this email has already consumed a slot
if redis.call("SISMEMBER", key, email) == 1 then
    return { "EXISTING" }
end

-- Count different emails already using this IP
local count = redis.call("SCARD", key)

if count >= max_signups then
    return { "LIMITED" }
end

-- New email: consume one slot
redis.call("SADD", key, email)

-- Set expiry only when the key is first created
if count == 0 then 
    redis.call("EXPIRE", key, ttl)
end

return { "ADDED", count + 1}
`;

type signupRateLimitResult = 
    | {
        status: "ADDED";
        count: number;
      }
    | {
        status: "EXISTING";
      }
    | {
        status: "LIMITED";
    };

const checkSignupRateLimit = redis.createScript<[string, number?]>(
    signupRateLimitScript,
);

export const signupRateLimit = {
    async check(
        ip: string,
        email: string,
    ): Promise<signupRateLimitResult>{
        const key = redisKeys.signupRateLimit(ip);

        const result = await checkSignupRateLimit.exec(
            [key],
            [
                email,
                String(MAX_SIGNUPS_PER_IP),
                String(SIGNUP_RATE_LIMIT_TTL),
            ],
        );

        const values = result as [string, number?];

        switch (values[0]){
            case "ADDED":
                return{
                    status: "ADDED",
                    count: values[1] ?? 0,
                };

            case "EXISTING":
                return {
                    status: "EXISTING",
                }

            case "LIMITED":
                return {
                    status: "LIMITED",
                };

            default:
                throw new Error("Unexpected signup rate limit result");
        }
    },

    async release(
        ip: string,
        email: string,
    ): Promise<void>{
        const key = redisKeys.signupRateLimit(ip);

        await redis.srem(key, email);
    }
};