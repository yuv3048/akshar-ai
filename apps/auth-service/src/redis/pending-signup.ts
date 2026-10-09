import { redis } from "@akshar/redis";
import { redisKeys } from "./keys.js";

export type pendingSignup = {
    firstName: string;
    lastName?: string;
    email: string;
    passwordHash: string;
    signupIp: string;
};

const PENDING_SIGNUP_TTL = 60 * 60;

export const pendingSignup = {
    async create(data: pendingSignup): Promise<void>{

        const key = redisKeys.pendingSignup(data.email);

        await redis.set(key, JSON.stringify(data), {
          ex: PENDING_SIGNUP_TTL,
        });

    },

    async get(email: string): Promise<pendingSignup | null>{

        const key = redisKeys.pendingSignup(email);

        const value = await redis.get<string>(key);

        if (!value) {
          return null;
        }

        return JSON.parse(value) as pendingSignup;
    },

    async delete(email: string): Promise<void>{

        const key = redisKeys.pendingSignup(email);

        await redis.del(key);
    },
};