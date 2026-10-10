import { z } from "zod";

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const emailSchema = z.email("Please enter a valid email").transform(email => email.trim().toLowerCase());
const fnameSchema = z.string().trim().min(2).max(15);
const lnameSchema = z.string().trim().min(2).max(15).optional();

export const signupSchema = z.object({ fname: fnameSchema, lname: lnameSchema, email: emailSchema, password: passwordSchema });
export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1, "Password is required") });
export const verifyEmailSchema = z.object({ email: emailSchema, otp: z.string().regex(/^\d{6}$/, "Enter the six-digit verification code") });
export const resendOtpSchema = z.object({ email: emailSchema });

export type LoginInput = z.infer<typeof loginSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>;
export type ResendOtpInput = z.infer<typeof resendOtpSchema>;
