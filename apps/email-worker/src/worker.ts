import { sendEmail } from "@akshar/email";
import type { EMAILJOB } from "@akshar/email";

interface Env {
  RESEND_API_KEY: string;
  APP_URL: string;
  EMAIL_FROM: string;
  AKSHAR_AI_LOGO_URL: string;
}

export default {
  async queue(batch: MessageBatch<EMAILJOB>, env: Env): Promise<void> {
    for (const message of batch.messages) {
      try {
        await sendEmail(message.body, {
          resendApiKey: env.RESEND_API_KEY,
          appUrl: env.APP_URL,
          from: env.EMAIL_FROM,
          logoUrl: env.AKSHAR_AI_LOGO_URL,
        });
        message.ack();
      } catch {
        // Never log message.body: verification/reset jobs contain OTPs.
        // Cloudflare Queues retries; after max_retries it routes to the DLQ.
        message.retry();
      }
    }
  },
};
