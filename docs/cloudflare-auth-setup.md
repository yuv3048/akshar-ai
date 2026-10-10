# Cloudflare auth flow setup

This branch moves auth state off Redis/BullMQ. The auth API runs as a Cloudflare Worker, transient signup/OTP/rate-limit state lives in a Durable Object, email jobs go through Cloudflare Queues, and user records live in Neon PostgreSQL through Drizzle.

## Endpoints

- `POST /api/auth/signup` — validates input, rate-limits signup, stores a pending signup and hashed OTP, then queues verification email.
- `POST /api/auth/verify-email` — checks OTP and lockout state, creates the verified user in Neon, then queues the welcome email.
- `POST /api/auth/resend-otp` — reissues the OTP with a cooldown of 1, 2, 4, 8, then 10 minutes (maximum 6 resends per rolling hour).
- `POST /api/auth/login` — checks credentials, rate-limits attempts, rejects unverified accounts, and sets a 15-minute Secure/HttpOnly session cookie.
- `POST /api/auth/logout` — clears the session cookie.

OTP lifetime is 7 minutes. Five incorrect OTP entries trigger a 30-minute lock. OTPs and password values are never written to application logs.

## Neon database

Create a Neon project and set `DATABASE_URL` on the auth Worker to the pooled Neon connection string. Run the SQL in `packages/db/migrations/0000_create_users.sql` in the Neon SQL Editor (or use Drizzle Kit's push command against the same database) before testing signup.

## Cloudflare resources

Create the email queue and dead-letter queue once:

```sh
cd apps/auth-service
pnpm exec wrangler queues create akshar-auth-email
pnpm exec wrangler queues create akshar-auth-email-dlq
```

The Durable Object binding and its initial migration are declared in `apps/auth-service/wrangler.toml`. Deploying that Worker provisions the binding.

## Secrets

Set the same high-entropy `INTERNAL_GATEWAY_SECRET` on both the gateway and auth service. This blocks direct public calls to the auth service; the gateway adds the header on internal service-binding requests.

In `apps/auth-service`, configure:
- `DATABASE_URL` — Neon connection string
- `INTERNAL_GATEWAY_SECRET` — shared gateway-to-auth secret
- `AUTH_TOKEN_SECRET` — random secret of at least 32 characters

In `apps/email-worker`, configure:
- `RESEND_API_KEY`
- `APP_URL` — public Akshar frontend URL
- `EMAIL_FROM` — verified sender, for example `Akshar AI <auth@your-verified-domain>`
- `AKSHAR_AI_LOGO_URL` — publicly reachable logo URL

In `apps/gateway`, configure:
- `INTERNAL_GATEWAY_SECRET` — the same value as the auth service

Use `pnpm exec wrangler secret put SECRET_NAME` from each app directory to add secrets. Do not commit secrets to Wrangler files or Git.

## Deploy order

1. Deploy `apps/email-worker` so the queue consumer is ready.
2. Deploy `apps/auth-service` so the Durable Object migration and queue producer are deployed.
3. Deploy `apps/gateway` so the service binding targets the auth Worker.

## Important limitations before production

- The login token is a 15-minute signed JWT in an HttpOnly cookie. A refresh-token/session store and protected-route verification middleware still need to be added before using this as the complete production session system.
- Welcome email delivery is queued after the user row is created. If queue submission fails, the pending welcome job is retained in the Durable Object and retried on a later login. For guaranteed delivery even if the user never signs in again, add a durable database outbox/periodic dispatcher.
- The lockfile must be regenerated locally after dependency changes with `pnpm install`; do not use `--frozen-lockfile` until that is done. Run typechecks and Worker dry-run builds before deployment.
- Configure the frontend's API URL and credentialed requests for the actual deployment domains. Do not enable wildcard credentialed CORS.
