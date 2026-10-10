import type { SignupInput } from "@akshar/validation";
import { userRepository } from "../repositories/user-repository.js";
import { signupRateLimit } from "../redis/signup-rate-limit.js";
import { hashPassword, verifyPassword } from "../security/password.js";
import { generateOtp, hashOtp } from "../security/otp.js";
import { emailOtp } from "../redis/email-otp.js";
import { pendingSignup } from "../redis/pending-signup.js";
import { authEmailQueue } from "../queues/email.queue.js";

export async function signup(
    input: SignupInput,
    ip: string,
) {
   
    const email = input.email.trim().toLowerCase();

    const existingUser = await userRepository.findByEmail(email);

    if(existingUser){
        throw new Error("Email is already registered");
    }

    const existingPendingSignup = await pendingSignup.get(email);

    if(existingPendingSignup){
        const passwordMatches = await verifyPassword(
            input.password,
            existingPendingSignup.passwordHash,
        );

        if(!passwordMatches){
            throw new Error("Invalid signup credentials");
        }

        return {
            status: "SIGNUP_RECOVERED" as const,
        }
    }


    const rateLimit = await signupRateLimit.check(
        ip,
        email,
    );

    if (rateLimit.status === "LIMITED"){
        throw new Error(
            "Too many signup attempts. Please try again later."
        );
    }

    const passwordHash = await hashPassword(input.password);

    try {
        await pendingSignup.create({
            firstName: input.fname,
            lastName: input.lname,
            email,
            passwordHash,
            signupIp: ip,
        });
    } catch (error) {
        await signupRateLimit.release(ip, email);
        throw error;
    }

    const otp = generateOtp();

    const otpHash = await hashOtp(otp);

    try {
        
          await emailOtp.create(email, otpHash);

    } catch (error) {
        await pendingSignup.delete(email);
        await signupRateLimit.release(ip, email);
        throw error;
    }


    try {
        await authEmailQueue.add("VERIFY_EMAIL", {
            type: "VERIFY_EMAIL",
            email,
            otp,
        });
    } catch (error) {
        // Do not log the OTP or expose Redis/BullMQ details.
        // Keep the pending signup so the user can retry email delivery.
        throw new Error(
            "We couldn't send your verification code right now. Please try again shortly."
        );
    }

    return {
        status: "VERIFICATION_EMAIL_QUEUED" as const,
    };



}