# WIGOD Education Hub billing foundation

## Launch pricing
- Primary (ECD A/B–Grade 7): USD $3 per month
- Secondary (Forms 1–6): USD $5 per month
- Tertiary (polytechnic/university): USD $7 per month
- Trial: 30 days
- Billing: monthly only; annual plans are intentionally excluded for launch.

## Included in this branch
- Supabase schema for active plans, user subscriptions, and payment transaction records.
- Row-level security policies allowing users to read active plans and only their own subscription/payment history.
- Authenticated Education Hub billing/pricing page at `/knowledge/billing`.
- No browser-side write access to subscription or payment status.

## Required before accepting real payments
1. Apply `supabase/migrations/20261024130000_wigod_education_subscriptions.sql` to the connected Supabase project.
2. Select and approve a payment provider that supports Zimbabwean merchant settlement and the intended payment methods.
3. Add server-only provider credentials in Vercel environment variables. Never place secret keys in `NEXT_PUBLIC_*` variables.
4. Implement authenticated checkout creation, signed webhook verification, idempotent transaction updates, receipts, trial expiry handling, and cancellation/renewal flows.
5. Ensure trial creation is server-side and limited to one per user; do not automatically charge after trial without explicit consent.
6. Test provider sandbox success, cancellation, failure, duplicate webhook, forged webhook, expired trial and access-control scenarios before enabling production checkout.

The pricing page currently presents the plan options and routes users back to Knowledge Hub to begin exploring. It does not claim to take payment until the provider integration is completed.
