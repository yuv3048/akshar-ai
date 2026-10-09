import { redis } from "@akshar/redis";
import { redisKeys } from "./keys";

const EMAIL_OTP_LOCK_TTL = 10 * 60;

export const emailOtpLock = {

    async create(email: string): Promise<void>{

        const key = redisKeys.emailOtpLock(email);

        await redis.set(key, "1",{
            ex: EMAIL_OTP_LOCK_TTL,
        })
    },

    async exists(email: string): Promise<boolean>{

        const key = redisKeys.emailOtpLock(email);

        const value = await redis.get<string>(key);

        return value !== null;
    },

    async delete(email: string): Promise<void>{

        const key = redisKeys.emailOtpLock(email);

        await redis.del(key);
    },
}