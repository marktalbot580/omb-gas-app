# OMB Gas Service – going live with logins and subscriptions

The app runs in local-only mode until `config.js` has your Supabase details. Do these steps in order.

## 1. Supabase (accounts + cloud storage) – free to start
1. Sign up at supabase.com and create a project (choose the London region, set a database password and keep it safe).
2. **SQL Editor** → New query → paste all of `backend/schema.sql` → Run.
3. **Project Settings → API**: copy the **Project URL** and the **anon public** key into `config.js` (`url` and `key`). The anon key is meant to be public. Never paste the `service_role` key anywhere in the app.
4. **Authentication → URL Configuration**: set **Site URL** to `https://marktalbot580.github.io/omb-gas-app/` (the app's address).
5. **Authentication → Providers → Email**: leave "Confirm email" on (recommended). Optionally set up your own SMTP later so the emails come from your own address.

## 2. Stripe (taking payment)
1. Create a Stripe account at stripe.com. Start in **Test mode**.
2. **Product catalogue → Add product** "OMB Gas Service", recurring, £15.00 monthly. Copy its **Price ID** (starts `price_`).
3. **Developers → API keys**: copy the **Secret key** (starts `sk_test_`).
4. **Settings → Billing → Customer portal**: switch it on (lets users update their card and cancel).

## 3. Connect them (Supabase Edge Functions)
1. Supabase → **Edge Functions**: create three functions named exactly `checkout`, `portal` and `stripe-webhook`, pasting in the matching file from `backend/functions/`. For `stripe-webhook`, turn **Verify JWT off**.
2. Supabase → **Edge Functions → Secrets**, add: `STRIPE_SECRET_KEY`, `STRIPE_PRICE_ID`, and `STRIPE_WEBHOOK_SECRET` (next step).
3. In Stripe → **Developers → Webhooks → Add endpoint**: URL `https://<your-project>.supabase.co/functions/v1/stripe-webhook`, events: `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.payment_failed`. Copy its **Signing secret** (`whsec_…`) into the `STRIPE_WEBHOOK_SECRET` secret.

## 4. Test, then go live
Sign up in the app, subscribe with Stripe's test card `4242 4242 4242 4242` (any future date, any CVC), check the app unlocks. When happy, switch Stripe to **Live mode**, repeat the API key / price / webhook steps with live values and update the three secrets.

## Before you sell it (UK)
- Register with the ICO (data protection fee) – you will hold other people's customers' names, addresses and phone numbers.
- Add a privacy policy and terms of service page, and link them from the sign-up screen.
- Each subscriber is responsible for their own certificates being correct; your terms should say so.
