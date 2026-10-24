-- WIGOD Education Hub subscriptions: monthly plans and 30-day trial foundation.
-- Apply this migration in the Supabase SQL editor before enabling billing.
create extension if not exists pgcrypto;

create table if not exists public.education_subscription_plans (
  id text primary key,
  name text not null,
  education_level text not null check (education_level in ('primary','secondary','tertiary')),
  monthly_price_cents integer not null check (monthly_price_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  trial_days integer not null default 30 check (trial_days between 0 and 90),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.education_subscription_plans
  (id, name, education_level, monthly_price_cents, currency, trial_days, is_active)
values
  ('primary-monthly', 'Primary School', 'primary', 300, 'USD', 30, true),
  ('secondary-monthly', 'Secondary School', 'secondary', 500, 'USD', 30, true),
  ('tertiary-monthly', 'Tertiary Education', 'tertiary', 700, 'USD', 30, true)
on conflict (id) do update set
  name = excluded.name,
  education_level = excluded.education_level,
  monthly_price_cents = excluded.monthly_price_cents,
  currency = excluded.currency,
  trial_days = excluded.trial_days,
  is_active = excluded.is_active,
  updated_at = now();

create table if not exists public.education_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  plan_id text not null references public.education_subscription_plans(id),
  status text not null default 'trialing'
    check (status in ('trialing','active','past_due','expired','cancelled','pending')),
  trial_starts_at timestamptz not null default now(),
  trial_ends_at timestamptz not null default (now() + interval '30 days'),
  current_period_starts_at timestamptz,
  current_period_ends_at timestamptz,
  cancel_at_period_end boolean not null default false,
  provider text,
  provider_customer_id text,
  provider_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists education_subscriptions_status_expiry_idx
  on public.education_subscriptions (status, trial_ends_at, current_period_ends_at);
create index if not exists education_subscriptions_user_idx
  on public.education_subscriptions (user_id);

create table if not exists public.education_payment_transactions (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.education_subscriptions(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_transaction_id text,
  idempotency_key text not null unique,
  amount_cents integer not null check (amount_cents > 0),
  currency text not null default 'USD' check (currency = 'USD'),
  status text not null default 'pending'
    check (status in ('pending','succeeded','failed','refunded')),
  checkout_url text,
  paid_at timestamptz,
  provider_payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider, provider_transaction_id)
);

create index if not exists education_payment_transactions_user_idx
  on public.education_payment_transactions (user_id, created_at desc);

alter table public.education_subscription_plans enable row level security;
alter table public.education_subscriptions enable row level security;
alter table public.education_payment_transactions enable row level security;

drop policy if exists "Anyone can read active education plans" on public.education_subscription_plans;
create policy "Anyone can read active education plans"
  on public.education_subscription_plans for select
  using (is_active = true);

drop policy if exists "Users can read their own education subscription" on public.education_subscriptions;
create policy "Users can read their own education subscription"
  on public.education_subscriptions for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Users can read their own education payment transactions" on public.education_payment_transactions;
create policy "Users can read their own education payment transactions"
  on public.education_payment_transactions for select to authenticated
  using (auth.uid() = user_id);

-- No client-side INSERT/UPDATE policies are intentionally provided for subscriptions
-- or transactions. Trial creation, payment initiation, and payment status changes must
-- be performed by trusted server routes; successful payments must be verified server-side.
