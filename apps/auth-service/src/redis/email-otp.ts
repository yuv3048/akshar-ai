import { redis } from "@akshar/redis";
import { redisKeys } from "./keys.js";

export type EmailOtp = {
    otpHash: string;
    attempts: number;
};

const EMAIL_OTP_TTL = 7 * 60;

export const emailOtp = {
    async create(email: string, otpHash: string): Promise<void>{

        const key = redisKeys.emailOtp(email);

        const data: EmailOtp = {
            otpHash,
            attempts: 0,
        };

        await redis.set(key, JSON.stringify(data),{
            ex: EMAIL_OTP_TTL,
        });
    },

    async get(email: string): Promise<EmailOtp | null>{

        const key = redisKeys.emailOtp(email);

        const value = await redis.get<string>(key);

        if(!value){
            return null;
        }

        return JSON.parse(value) as EmailOtp;
    },

    async delete(email: string): Promise<void>{
        const key = redisKeys.emailOtp(email);

        await redis.del(key);
    },
}