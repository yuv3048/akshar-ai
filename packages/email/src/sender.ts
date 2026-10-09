import { resend } from "./resend";
import { render } from "@react-email/render";

import { WelcomeEmail } from "./templates/WelcomeEmail";
import { VerificationOtpEmail } from "./templates/VerificationOtpEmail";
import { PasswordResetOtpEmail } from "./templates/PasswordResetOtpEmail";
import { EMAILJOB } from "./types"

function requiredEnv(name: string): string {
  const value = process.env[name];

  if (!value) {
    throw new Error(`${name} is not defined`);
  }

  return value;
}

const APP_URL = requiredEnv("APP_URL");
const FROM = requiredEnv("EMAIL_FROM");
const LOGO = requiredEnv("AKSHAR_AI_LOGO_URL");


export async function sendEmail(job: EMAILJOB){

    let subject: string;
    let html: string;

    switch(job.type){

        case "WELCOME_EMAIL": {

            html = await render(
               WelcomeEmail({
                 logoUrl: LOGO,
                 appUrl: APP_URL,
                 fname: job.fname,
               })
            )

            subject= "Welcome to Akshar AI";
            break;
        }

        case "VERIFY_EMAIL": {

            const verificationUrl = `${APP_URL}/verify-email`

            html = await render(
                VerificationOtpEmail({
                    verificationCode: job.otp,
                    logoUrl: LOGO,
                    verificationUrl,
                })
            )

            subject = "Your Akshar AI verification code"
            break;
        }

        case "PASSWORD_RESET": {

            const resetUrl = `${APP_URL}/reset-password`

            html = await render(
                PasswordResetOtpEmail({
                    resetUrl,
                    verificationCode: job.otp,
                    logoUrl: LOGO,
                })
            )

            subject = "Your Akshar AI password reset code";
            break;
        }
    }

        const { data, error } = await resend.emails.send({
            from: FROM,
            to: job.email,
            subject,
            html,
        });

        if(error){
            throw new Error(`Failed to send email: ${error?.message}`)
        }

    
}



