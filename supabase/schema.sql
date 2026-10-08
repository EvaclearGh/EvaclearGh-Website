-- =============================================================================
-- Evaclear customer accounts & credit — Supabase database setup
-- Run this ONCE in your Supabase project: Dashboard → SQL Editor → New query →
-- paste this whole file → Run. Safe to re-run (it replaces functions/policies).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Customer profiles (one per login)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id                  uuid primary key references auth.users (id) on delete cascade,
  created_at          timestamptz not null default now(),
  email               text,
  account_type        text not null default 'individual' check (account_type in ('individual', 'institution')),
  full_name           text not null default '',
  phone               text not null default '',
  business_name       text,
  business_type       text,
  registration_number text,
  contact_role        text,
  address             text,
  city                text,
  gps                 text,
  requested_credit    numeric(12, 2) not null default 0 check (requested_credit >= 0),
  -- Set by Evaclear staff only (protected by trigger below):
  status              text not null default 'pending' check (status in ('pending', 'approved', 'rejected', 'suspended')),
  credit_limit        numeric(12, 2) not null default 0 check (credit_limit >= 0),
  payment_terms_days  integer not null default 30 check (payment_terms_days between 0 and 365),
  role                text not null default 'customer' check (role in ('customer', 'admin')),
  admin_notes         text,
  approved_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- 2. Orders (credit orders + any order placed while logged in)
-- ---------------------------------------------------------------------------
create table if not exists public.orders (
  id              uuid primary key default gen_random_uuid(),
  ref             text not null unique,
  user_id         uuid not null references public.profiles (id) on delete cascade,
  created_at      timestamptz not null default now(),
  items           jsonb not null,
  subtotal        numeric(12, 2) not null check (subtotal >= 0),
  delivery_fee    numeric(12, 2) not null default 0 check (delivery_fee >= 0),
  total           numeric(12, 2) not null check (total >= 0),
  payment_method  text not null check (payment_method in ('credit', 'momo', 'bank', 'whatsapp', 'online')),
  payment_ref     text,
  delivery        jsonb,
  status          text not null default 'pending' check (status in ('pending', 'confirmed', 'delivered', 'cancelled')),
  amount_paid     numeric(12, 2) not null default 0 check (amount_paid >= 0),
  due_date        date,
  admin_notes     text
);
create index if not exists orders_user_idx on public.orders (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- 3. Helper: is the current user an Evaclear admin?
-- ---------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- ---------------------------------------------------------------------------
-- 4. Create a profile automatically when someone signs up
--    (details come from the registration form via user metadata)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
begin
  insert into public.profiles (
    id, email, account_type, full_name, phone, business_name, business_type,
    registration_number, contact_role, address, city, gps, requested_credit
  ) values (
    new.id,
    new.email,
    case when m->>'account_type' = 'institution' then 'institution' else 'individual' end,
    coalesce(m->>'full_name', ''),
    coalesce(m->>'phone', ''),
    nullif(m->>'business_name', ''),
    nullif(m->>'business_type', ''),
    nullif(m->>'registration_number', ''),
    nullif(m->>'contact_role', ''),
    nullif(m->>'address', ''),
    nullif(m->>'city', ''),
    nullif(m->>'gps', ''),
    greatest(coalesce(nullif(m->>'requested_credit', '')::numeric, 0), 0)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- 5. Customers may edit their contact details, but NOT their approval status,
--    credit limit, payment terms or role. Only admins can change those.
-- ---------------------------------------------------------------------------
-- Runs with the caller's own rights, so changes made by you in the Supabase
-- dashboard / SQL editor are always allowed; website users are checked.
create or replace function public.protect_profile_fields()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    new.status             := old.status;
    new.credit_limit       := old.credit_limit;
    new.payment_terms_days := old.payment_terms_days;
    new.role               := old.role;
    new.admin_notes        := old.admin_notes;
    new.approved_at        := old.approved_at;
    new.email              := old.email;
  elsif new.status = 'approved' and old.status is distinct from 'approved' then
    new.approved_at := now();
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_fields on public.profiles;
create trigger protect_profile_fields
  before update on public.profiles
  for each row execute function public.protect_profile_fields();

-- Customers may not change an order after placing it (admins can).
create or replace function public.protect_orders()
returns trigger
language plpgsql security invoker set search_path = public
as $$
begin
  if current_user in ('authenticated', 'anon') and not public.is_admin() then
    raise exception 'Only Evaclear staff can change an order.';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_orders on public.orders;
create trigger protect_orders
  before update on public.orders
  for each row execute function public.protect_orders();

-- ---------------------------------------------------------------------------
-- 6. Credit balance: limit, amount owed, amount available
-- ---------------------------------------------------------------------------
create or replace function public.credit_summary(p_user uuid default auth.uid())
returns table (credit_limit numeric, outstanding numeric, available numeric, overdue numeric, payment_terms_days integer, status text)
language sql stable security definer set search_path = public
as $$
  select
    p.credit_limit,
    coalesce(o.outstanding, 0),
    greatest(p.credit_limit - coalesce(o.outstanding, 0), 0),
    coalesce(o.overdue, 0),
    p.payment_terms_days,
    p.status
  from public.profiles p
  left join lateral (
    select
      sum(total - amount_paid) filter (where total > amount_paid) as outstanding,
      sum(total - amount_paid) filter (where total > amount_paid and due_date < current_date) as overdue
    from public.orders
    where user_id = p.id and payment_method = 'credit' and status <> 'cancelled'
  ) o on true
  where p.id = p_user
    and (p_user = auth.uid() or public.is_admin());
$$;

-- ---------------------------------------------------------------------------
-- 7. Place an order on credit — the ONLY way to create a credit order.
--    Checks the account is approved, nothing is overdue and the order fits
--    within the remaining credit.
-- ---------------------------------------------------------------------------
create or replace function public.place_credit_order(
  p_ref text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric, p_delivery jsonb
)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare
  v_profile public.profiles;
  v_summary record;
  v_total numeric := round(coalesce(p_subtotal, 0) + coalesce(p_delivery_fee, 0), 2);
  v_order public.orders;
begin
  if auth.uid() is null then
    raise exception 'Please log in to buy on credit.';
  end if;
  select * into v_profile from public.profiles where id = auth.uid() for update;
  if v_profile.status <> 'approved' then
    raise exception 'Your account is not approved for credit yet.';
  end if;
  if p_subtotal is null or p_subtotal <= 0 or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then
    raise exception 'Your order is empty.';
  end if;
  select * into v_summary from public.credit_summary(auth.uid());
  if v_summary.overdue > 0 then
    raise exception 'You have an overdue balance. Please settle it before placing a new credit order.';
  end if;
  if v_total > v_summary.available then
    raise exception 'This order (GHS %) is more than your available credit (GHS %).', v_total, v_summary.available;
  end if;

  insert into public.orders (ref, user_id, items, subtotal, delivery_fee, total, payment_method, delivery, due_date)
  values (p_ref, auth.uid(), p_items, p_subtotal, coalesce(p_delivery_fee, 0), v_total, 'credit', p_delivery,
          current_date + v_profile.payment_terms_days)
  returning * into v_order;
  return v_order;
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. Row-level security: customers only ever see their own data
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.orders   enable row level security;

drop policy if exists "profiles: read own or admin" on public.profiles;
create policy "profiles: read own or admin" on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists "profiles: update own or admin" on public.profiles;
create policy "profiles: update own or admin" on public.profiles
  for update using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

drop policy if exists "orders: read own or admin" on public.orders;
create policy "orders: read own or admin" on public.orders
  for select using (user_id = auth.uid() or public.is_admin());

-- Logged-in customers can record their MoMo / bank / WhatsApp orders directly.
-- Credit orders can only be created through place_credit_order().
drop policy if exists "orders: insert own non-credit" on public.orders;
create policy "orders: insert own non-credit" on public.orders
  for insert with check (
    user_id = auth.uid()
    and payment_method <> 'credit'
    and status = 'pending'
    and amount_paid = 0
  );

drop policy if exists "orders: admin update" on public.orders;
create policy "orders: admin update" on public.orders
  for update using (public.is_admin()) with check (public.is_admin());

grant execute on function public.credit_summary(uuid) to authenticated;
grant execute on function public.place_credit_order(text, jsonb, numeric, numeric, jsonb) to authenticated;
grant execute on function public.is_admin() to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Make yourself an admin (run AFTER you have registered on the website):
--    update public.profiles set role = 'admin', status = 'approved'
--    where email = 'your-email@example.com';
-- ---------------------------------------------------------------------------

-- ---------------------------------------------------------------------------
-- 10. Create missing profiles for anyone who signed up before this script ran
-- ---------------------------------------------------------------------------
insert into public.profiles (id, email, full_name, phone)
select u.id, u.email, coalesce(u.raw_user_meta_data->>'full_name', ''), coalesce(u.raw_user_meta_data->>'phone', '')
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
