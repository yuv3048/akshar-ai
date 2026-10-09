import { redis } from "@akshar/redis";
import { redisKeys } from "./keys.js";

const MAX_OTP_ATTEMPTS = 5;
const OTP_LOCK_TTL = 10 * 60;


const verifyEmailOtpScript = `

local otp_key = KEYS[1]
local lock_key = KEYS[2]

local submitted_hash = ARGV[1]
local max_attempts = tonumber(ARGV[2])
local lock_ttl = tonumber(ARGV[3])

-- 1. Check whether the email is currently locked
if redis.call("EXISTS", lock_key) == 1 then
    return{ "LOCKED" }
end

-- 2. Get OTP state
local otp_json = redis.call("GET", otp_key)

if not otp_json then
    return { "EXPIRED" }
end

-- 3. Decode JSON
local otp_data = cjson.decode(otp_json)

-- 4. Compare hashes
if otp_data.otpHash == submitted_hash then
    return { "SUCCESS" }
end

-- 5. Wrong OTP , increment attempts
otp_data.attempts = otp_data.attempts + 1

-- 6. Lock after maximum attempts
if otp_data.attempts >= max_attempts then
    redis.call("SET", lock_key, "1", "EX", lock_ttl)
    return { "LOCKED", otp_data.attempts }
end

-- 7. Save updated attempts while preserving remaining TTl
local remaining_ttl = redis.call("TTL", otp_key)

redis.call(
    "SET",
    otp_key,
    cjson.encode(otp_data),
    "EX",
    remaining_ttl
)

return { "INVALID", otp_data.attempts }

`;

export type OtpVerificationResult = 
    |   {
            status: "SUCCESS";
        }
    |   {
            status: "INVALID";
            attempts: number;
        }
    |   {
            status: "LOCKED";
            attempts?: number;
        }
    |   {
            status: "EXPIRED";
        };

const verifyEmailOtp = redis.createScript<[string, number?]>(
    verifyEmailOtpScript,
);

export const otpVerification = {

    async verify(
        email: string,
        submittedHash: string,
    ): Promise<OtpVerificationResult>{
        const otpKey = redisKeys.emailOtp(email);
        const lockKey = redisKeys.emailOtpLock(email);


        const result = await verifyEmailOtp.exec(
          [otpKey, lockKey],
          [
            submittedHash,
            String(MAX_OTP_ATTEMPTS),
            String(OTP_LOCK_TTL),
          ],
        );

        const values = result as [string, number?];

        switch (values[0]){

            case "SUCCESS":
                return {
                    status: "SUCCESS",
                };

            case "INVALID":
                return{
                    status: "INVALID",
                    attempts: values[1] ?? 0,
                };

            case "LOCKED":
                return {
                    status: "LOCKED",
                    attempts: values[1],
                };

            case "EXPIRED":
                return {
                    status: "EXPIRED",
                };

            default:
                throw new Error("Unexpected OTP verification result");
        }
    },
};