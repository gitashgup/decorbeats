# Cashfree checkout rollout

The application supports Cashfree hosted checkout while retaining Razorpay as a rollback provider. Cashfree credentials are server-only; never expose them through a `VITE_` variable.

## 1. Apply the database migration

Run `migrations/20260808_cashfree_checkout_hardening.sql` in the production Supabase SQL editor. It creates pending checkout orders, idempotent payment finalisation, and all-or-none stock updates.

## 2. Configure Vercel

Add these variables to Preview for sandbox testing, then Production for launch:

```text
PAYMENT_PROVIDER=cashfree
CASHFREE_CLIENT_ID=<merchant client ID>
CASHFREE_CLIENT_SECRET=<merchant secret>
CASHFREE_ENVIRONMENT=sandbox
CASHFREE_API_VERSION=2026-01-01
PUBLIC_SITE_URL=https://www.decorbeats.com
SUPABASE_URL=<project URL>
SUPABASE_SERVICE_ROLE_KEY=<service role key>
```

Use `CASHFREE_ENVIRONMENT=production` only with production credentials. Keep the existing Razorpay variables available for rollback.

## 3. Configure Cashfree

- Whitelist `https://www.decorbeats.com`.
- Configure the payment webhook URL as `https://www.decorbeats.com/api/cashfree-webhook`.
- Enable payment-success, payment-failed, and user-dropped events on the latest available webhook version.
- Ensure the Contact, Terms, Privacy, Shipping, and Refund/Cancellation pages are published and linked in the site footer.

## 4. Release checks

Test in sandbox before changing the Production provider flag:

- successful payment and browser return;
- customer closes the browser after payment (webhook still records one order);
- failed and user-dropped payments preserve the bag;
- duplicate browser verification and duplicate webhooks create one order and one stock change;
- simultaneous purchase of the last unit produces either a normal order or a paid `stock_review` order without partial stock updates;
- paid website orders appear in Admin → Orders;
- mobile same-tab return and desktop modal checkout;
- one small live transaction followed by dashboard/order reconciliation.

To roll back checkout initiation without removing historical Cashfree data, set `PAYMENT_PROVIDER=razorpay` and redeploy.
