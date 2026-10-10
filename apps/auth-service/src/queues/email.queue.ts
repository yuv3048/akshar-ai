import type { EMAILJOB } from "@akshar/email";

export interface EmailQueue {
  send(message: EMAILJOB, options?: QueueSendOptions): Promise<void>;
}

export interface QueueSendOptions {
  delaySeconds?: number;
}

export async function enqueueAuthEmail(
  queue: EmailQueue,
  message: EMAILJOB,
): Promise<void> {
  // Cloudflare Queues owns retries/backoff; never log message bodies (they contain OTPs).
  await queue.send(message, { delaySeconds: 0 });
}
