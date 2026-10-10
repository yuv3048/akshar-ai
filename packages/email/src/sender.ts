import { Resend } from "resend";
import { render } from "@react-email/render";
import { WelcomeEmail } from "./templates/WelcomeEmail";
import { VerificationOtpEmail } from "./templates/VerificationOtpEmail";
import { PasswordResetOtpEmail } from "./templates/PasswordResetOtpEmail";
import type { EMAILJOB } from "./types.js";

export type EmailRuntimeConfig = {
  resendApiKey: string;
  appUrl: string;
  from: string;
  logoUrl: string;
};

export async function sendEmail(job: EMAILJOB, config: EmailRuntimeConfig): Promise<void> {
  if (!config.resendApiKey || !config.appUrl || !config.from || !config.logoUrl) {
    throw new Error("Email worker configuration is incomplete");
  }

  const resend = new Resend(config.resendApiKey);
  let subject: string;
  let html: string;

  switch (job.type) {
    case "WELCOME_EMAIL":
      html = await render(WelcomeEmail({ logoUrl: config.logoUrl, appUrl: config.appUrl, fname: job.fname }));
      subject = "Welcome to Akshar AI";
      break;
    case "VERIFY_EMAIL":
      html = await render(VerificationOtpEmail({ verificationCode: job.otp, logoUrl: config.logoUrl, verificationUrl: `${config.appUrl}/verify-email` }));
      subject = "Your Akshar AI verification code";
      break;
    case "PASSWORD_RESET":
      html = await render(PasswordResetOtpEmail({ resetUrl: `${config.appUrl}/reset-password`, verificationCode: job.otp, logoUrl: config.logoUrl }));
      subject = "Your Akshar AI password reset code";
      break;
    default: {
      const exhaustive: never = job;
      throw new Error(`Unsupported email job: ${String(exhaustive)}`);
    }
  }

  const { error } = await resend.emails.send({ from: config.from, to: job.email, subject, html });
  if (error) throw new Error("Email provider rejected the message");
}
