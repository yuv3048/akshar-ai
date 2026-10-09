export const redisKeys = {
    pendingSignup: (email: string)=>
        `pending_signup:${email}`,

    emailOtp: (email: string)=>
        `email_otp:${email}`,

    emailOtpLock: (email: string)=>
        `email_otp_lock:${email}`,

    signupRateLimit: (ip: string)=>
        `signup:${ip}`,
}