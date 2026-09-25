# Razorpay Live Billing Setup

KitchenIQ uses Razorpay Subscriptions for paid Pro billing.

## Razorpay plans

Create these two INR plans in the Razorpay Dashboard:

| KitchenIQ plan | Razorpay period | Interval | Amount |
|---|---|---:|---:|
| Pro Monthly | monthly | 1 | INR 2,999 |
| Pro Annual | yearly | 1 | INR 28,788 |

Save the resulting plan IDs.

## Render environment variables

Add these variables to the **KitchenIQ** Render service. Never commit their values to Git:

- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- RAZORPAY_WEBHOOK_SECRET
- RAZORPAY_PLAN_ID_MONTHLY
- RAZORPAY_PLAN_ID_ANNUAL

Use Razorpay **Live** credentials for production and keep the secret values private.

## Webhook

Configure a Razorpay webhook pointing to:

https://kitcheniq-h1aa.onrender.com/api/v1/billing/webhook

Use the same value configured as `RAZORPAY_WEBHOOK_SECRET`.

Enable subscription lifecycle events including:

- subscription.activated
- subscription.pending
- subscription.halted
- subscription.cancelled
- subscription.completed
- subscription.expired

## Security

KitchenIQ verifies the Razorpay Checkout signature server-side before activating Pro. Webhook requests are also verified with HMAC SHA-256 before changing subscription state.

The Razorpay secret is backend-only. The frontend receives only the public Razorpay key ID and subscription ID required to open Checkout.
