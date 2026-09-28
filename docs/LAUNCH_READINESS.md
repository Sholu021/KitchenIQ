# KitchenIQ Launch Readiness Runbook

## Purpose

This document is the operational gate for a KitchenIQ production launch. A check is marked **verified** only when there is direct evidence from production, CI, or the provider. Configuration alone is not treated as proof.

## Current production baseline

- Repository: Sholu021/KitchenIQ
- Production backend: Render service `KitchenIQ`
- Production backend URL: `https://kitcheniq-h1aa.onrender.com`
- Frontend: Vercel
- Database: Neon PostgreSQL
- Billing: Razorpay
- Current verified live application commit: `76ec9cce020bc5e1aee0ec72361f0029c0be91a0`

## Verified

### Application
- Authentication and session persistence
- Inventory
- CSV inventory import/export
- Sales
- Purchasing
- Recipes
- Production
- Waste
- Analytics
- Reports UI
- Team management
- Settings
- AI Insights
- AI Copilot
- Indian-rupee currency display
- Production build/deployment
- Backend database migrations through Alembic
- Production billing schema:
  - `billing_subscriptions`
  - `billing_webhook_events`
- Billing duplicate-webhook idempotency code
- Billing webhook signature validation code
- HttpOnly cookie authentication and CSRF protection
- Authenticated organization-scoped data access on audited resources
- CI backend tests and frontend build
- Render production service is running and latest deployment is live

### Billing flow verified in Razorpay test mode
- Test plans configured
- Test webhook configured
- Required Razorpay environment variables configured in Render
- Subscription checkout succeeded with a domestic Razorpay test card
- Payment verification endpoint returned HTTP 200
- Pro activation was observed

## Open provider-level verification

### 1. Razorpay webhook after secret rotation

A previous webhook delivery reached the production endpoint but returned HTTP 400. The Razorpay test webhook secret was subsequently rotated and the matching Render environment variable was updated.

The next lifecycle event must produce a successful webhook request after the rotation.

Do **not** create another payment solely for this check while the account is already Pro.

Acceptable evidence:
- Render logs show `POST /api/v1/billing/webhook` with a successful response after the rotation; and
- the corresponding subscription/org state is correct.

If the next legitimate Razorpay lifecycle event again returns 400, inspect the signature diagnostic log:
`Razorpay webhook signature validation failed: body_bytes=%d signature_present=%s`
No secret, signature, or request body should ever be logged.

### 2. Neon backup and restore

Production backup/restore has not been verified through the available workspace.

Launch evidence required:
1. Confirm automated Neon backup/PITR retention for the production database.
2. Establish a restore target that is isolated from production.
3. Restore a recent production snapshot/PITR point.
4. Run migration/schema checks.
5. Verify representative application data.
6. Record restore timestamp and elapsed time.
7. Record the recovery point and recovery time achieved.

Never test restoration by overwriting the live production database.

## Business/legal gates still requiring owner completion

These are not application-code defects and should not be represented as complete until the business owner supplies and approves the actual terms.

- ICP and initial customer segment
- Final pricing/plan packaging
- Trial policy and eligibility
- Refund/cancellation policy
- Terms of Service
- Privacy Policy
- Data retention/deletion policy
- Customer support channel and response expectations
- Customer onboarding flow/content
- Production support/incident contact
- Business/legal review appropriate to the jurisdictions served

The application should not claim that these policies exist merely because placeholder pages or links are added.

## Monitoring and incident response

Minimum production checks:

- Render service remains live.
- `/health` returns HTTP 200.
- Vercel deployment status is successful.
- CI is green on the production commit.
- Application logs are monitored for 5xx spikes, database authentication failures, and billing webhook failures.
- Billing webhook failures are investigated before changing secrets or disabling validation.
- Database credentials are rotated through the provider and deployment environment, never committed to Git.

## Release gate

A public launch is operationally ready only when:

- CI is green on the exact production commit.
- Production deployment is live.
- Core customer journey has passed.
- Billing checkout/payment verification has passed.
- Razorpay webhook verification has passed after the final webhook-secret configuration.
- Database backup/restore has been demonstrated.
- Legal/business launch gates above are completed.
- A support/incident owner and contact path exist.

## Incident rule

When a provider integration fails, preserve evidence first. Do not weaken signature validation, authentication, tenant isolation, or CSRF controls to make a provider check pass.
