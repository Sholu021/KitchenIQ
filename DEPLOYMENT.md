# KitchenIQ — Production Deployment Guide

KitchenIQ is a split-stack SaaS application:

- Frontend: Next.js App Router in `/frontend`, deployed on Vercel.
- Backend: FastAPI in `/backend`, deployed on Render.
- Database: PostgreSQL in the production environment.
- Authentication: HttpOnly access/refresh cookies with CSRF protection.
- Billing: Razorpay subscriptions and signed webhooks.

## Current production architecture

Frontend:
- Production URL: `https://kitcheniq-frontend.vercel.app`
- Next.js proxies `/api/v1/*` to the Render backend.
- Browser code uses the same-origin `/api/v1` path; do not restore a direct cross-origin API URL.

Backend:
- Render service: `KitchenIQ`
- Root directory: `backend`
- Build: `pip install -r requirements.txt`
- Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health check: `/health`

## Database migrations

Production schema changes are managed with Alembic.

The application must NOT call `Base.metadata.create_all()` during production startup. Apply migrations explicitly:

```bash
cd backend
alembic upgrade head
```

Before applying a migration to production:

1. Confirm the production `DATABASE_URL`.
2. Take/verify a current database backup.
3. Review the migration and its downgrade path.
4. Run the migration during a controlled deployment window.
5. Verify `alembic current` and application health after deployment.

Current billing migrations include:

- `billing_subscriptions_20260926`
- `billing_webhook_events_20260926`

Do not use `Base.metadata.create_all()` as a substitute for migrations.

## Environment variables

Production secrets must be configured in the hosting provider, never committed to Git.

Important backend variables include:

- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_ALGORITHM`
- `COOKIE_SECURE=true`
- `COOKIE_SAMESITE=none`
- `ALLOWED_ORIGINS=https://kitcheniq-frontend.vercel.app`
- `RAZORPAY_KEY_ID`
- `RAZORPAY_KEY_SECRET`
- `RAZORPAY_WEBHOOK_SECRET`
- `RAZORPAY_PLAN_ID_MONTHLY`
- `RAZORPAY_PLAN_ID_ANNUAL`

Keep `COOKIE_DOMAIN` unset unless the deployment architecture explicitly requires a shared parent domain.

## Billing

Razorpay webhooks must use the production webhook secret and send the signature in `X-Razorpay-Signature`.

Before enabling paid customer traffic, verify:

1. Subscription creation works with live Razorpay plans.
2. Payment signature verification rejects altered signatures.
3. Webhook signature verification rejects altered payloads.
4. Duplicate webhook deliveries are idempotent.
5. Activation changes the organization to Pro.
6. Cancellation/expiry returns the organization to Free.
7. Failed payment and refund scenarios have been tested.

Never test destructive billing operations against a real customer subscription.

## Security

- Access and refresh tokens are HttpOnly cookies.
- Unsafe cookie-authenticated requests require the CSRF token.
- CORS is restricted to configured frontend origins.
- Production debug/demo startup behavior is disabled.
- Background schedulers are disabled unless explicitly enabled.
- Organization-scoped authorization must be preserved for every authenticated resource.

## Backups and recovery

A production backup policy must exist outside the application repository.

At minimum:

- automated PostgreSQL backups,
- documented retention period,
- a tested restore procedure,
- periodic restore verification.

A backup that has never been restored should not be treated as a verified recovery mechanism.

## CI

GitHub Actions runs:

- backend pytest,
- frontend production build.

Workflow: `.github/workflows/ci.yml`

A production deployment should only be promoted after the relevant CI checks pass.

## Release checklist

Before each production release:

- [ ] CI passes.
- [ ] Database migration reviewed.
- [ ] Production backup verified when schema changes are involved.
- [ ] Migration applied successfully.
- [ ] Backend health check passes.
- [ ] Login/logout works.
- [ ] Core inventory and sales flows work.
- [ ] Pro-gated features remain correctly gated.
- [ ] Billing/webhook behavior is verified when billing code changed.
- [ ] No new production application errors are present.
