-- =============================================================================
-- Evaclear: automatic WhatsApp alerts to the company number
--   • every order placed on the website (guests and logged-in customers)
--   • every new customer account waiting for approval
--
-- Run this AFTER schema.sql: Supabase → SQL Editor → New query → paste → Run.
-- Safe to re-run. Then save your WhatsApp alert key (see the bottom of this file).
-- =============================================================================

-- Supabase's built-in extension for sending web requests from the database
create extension if not exists pg_net with schema extensions;

-- ---------------------------------------------------------------------------
-- 1. Orders: also accept guest orders (not logged in) and keep customer details
-- ---------------------------------------------------------------------------
alter table public.orders alter column user_id drop not null;
alter table public.orders add column if not exists customer jsonb;

-- ---------------------------------------------------------------------------
-- 2. Private settings (NOT reachable from the website or the public API)
-- ---------------------------------------------------------------------------
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.whatsapp_settings (
  id              boolean primary key default true check (id),   -- single row
  enabled         boolean not null default true,
  provider        text not null default 'callmebot' check (provider in ('callmebot', 'cloudapi')),
  -- CallMeBot (free, easiest): https://www.callmebot.com/blog/free-api-whatsapp-messages/
  phone           text,          -- company WhatsApp in international format, e.g. +233256116151
  callmebot_key   text,
  -- WhatsApp Cloud API (Meta, official) — optional alternative
  cloud_token     text,
  cloud_phone_id  text,
  cloud_template  text,          -- approved template name with ONE body variable {{1}}; leave empty to send plain text
  cloud_language  text default 'en',
  site_url        text default 'https://www.evacleartradingenterprise.com'
);

-- Log of every alert sent (handy for checking it works)
create table if not exists private.whatsapp_log (
  id         bigserial primary key,
  created_at timestamptz not null default now(),
  kind       text,
  message    text,
  request_id bigint
);

-- ---------------------------------------------------------------------------
-- 3. Send one WhatsApp message to the company number
-- ---------------------------------------------------------------------------
create or replace function private.send_whatsapp(p_kind text, p_message text)
returns void
language plpgsql security definer set search_path = private, public, extensions
as $$
declare
  s private.whatsapp_settings;
  v_id bigint;
  v_msg text := left(p_message, 3500);
begin
  select * into s from private.whatsapp_settings where id;
  if not found or not s.enabled then
    return;
  end if;

  if s.provider = 'callmebot' and s.phone is not null and s.callmebot_key is not null then
    select net.http_get(
      url    := 'https://api.callmebot.com/whatsapp.php',
      params := jsonb_build_object('phone', s.phone, 'text', v_msg, 'apikey', s.callmebot_key),
      timeout_milliseconds := 10000
    ) into v_id;
  elsif s.provider = 'cloudapi' and s.cloud_token is not null and s.cloud_phone_id is not null and s.phone is not null then
    select net.http_post(
      url     := 'https://graph.facebook.com/v21.0/' || s.cloud_phone_id || '/messages',
      headers := jsonb_build_object('Authorization', 'Bearer ' || s.cloud_token, 'Content-Type', 'application/json'),
      body    := case
        when coalesce(s.cloud_template, '') <> '' then jsonb_build_object(
          'messaging_product', 'whatsapp', 'to', regexp_replace(s.phone, '\D', '', 'g'), 'type', 'template',
          'template', jsonb_build_object('name', s.cloud_template, 'language', jsonb_build_object('code', s.cloud_language),
            'components', jsonb_build_array(jsonb_build_object('type', 'body',
              'parameters', jsonb_build_array(jsonb_build_object('type', 'text', 'text', replace(v_msg, E'\n', ' | ')))))))
        else jsonb_build_object(
          'messaging_product', 'whatsapp', 'to', regexp_replace(s.phone, '\D', '', 'g'), 'type', 'text',
          'text', jsonb_build_object('body', v_msg))
      end,
      timeout_milliseconds := 10000
    ) into v_id;
  else
    return;
  end if;

  insert into private.whatsapp_log (kind, message, request_id) values (p_kind, v_msg, v_id);
exception when others then
  -- Never let an alert problem stop an order or sign-up from being saved
  raise warning 'WhatsApp alert failed: %', sqlerrm;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Place an order (guests or logged-in customers, any payment except credit)
--    Credit orders still go through place_credit_order() in schema.sql.
-- ---------------------------------------------------------------------------
create or replace function public.submit_order(
  p_ref text, p_items jsonb, p_subtotal numeric, p_delivery_fee numeric,
  p_payment_method text, p_payment_ref text, p_delivery jsonb, p_customer jsonb
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  v_phone text := coalesce(p_customer->>'phone', '');
begin
  if p_payment_method not in ('momo', 'bank', 'whatsapp', 'online') then
    raise exception 'Unknown payment method.';
  end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 or jsonb_array_length(p_items) > 100 then
    raise exception 'Your order is empty.';
  end if;
  if p_subtotal is null or p_subtotal <= 0 or p_subtotal > 500000 or coalesce(p_delivery_fee, 0) < 0 then
    raise exception 'Order total is not valid.';
  end if;
  if length(coalesce(p_ref, '')) not between 6 and 40 then
    raise exception 'Order reference is not valid.';
  end if;
  -- simple protection against repeated / spam submissions
  if (select count(*) from public.orders where customer->>'phone' = v_phone and created_at > now() - interval '10 minutes') >= 5 then
    raise exception 'Too many orders in a short time. Please contact us on WhatsApp.';
  end if;

  insert into public.orders (ref, user_id, items, subtotal, delivery_fee, total, payment_method, payment_ref, delivery, customer)
  values (p_ref, auth.uid(), p_items, p_subtotal, coalesce(p_delivery_fee, 0),
          round(p_subtotal + coalesce(p_delivery_fee, 0), 2), p_payment_method, nullif(p_payment_ref, ''), p_delivery, p_customer)
  on conflict (ref) do nothing;
  return p_ref;
end;
$$;
grant execute on function public.submit_order(text, jsonb, numeric, numeric, text, text, jsonb, jsonb) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Alert: new order
-- ---------------------------------------------------------------------------
create or replace function private.order_alert()
returns trigger
language plpgsql security definer set search_path = private, public
as $$
declare
  p public.profiles;
  v_items text;
  v_name text;
  v_phone text;
  v_pay text;
  v_site text;
begin
  select * into p from public.profiles where id = new.user_id;
  select site_url into v_site from private.whatsapp_settings where id;

  select string_agg(format('- %s x %s%s = GHS %s',
           coalesce(i->>'qty', '1'), coalesce(i->>'name', 'Item'),
           case when coalesce(i->>'variantLabel', '') <> '' then ' (' || (i->>'variantLabel') || ')' else '' end,
           to_char(coalesce((i->>'qty')::numeric, 1) * coalesce((i->>'price')::numeric, 0), 'FM999G999G990D00')), E'\n')
    into v_items
  from jsonb_array_elements(new.items) i;

  v_name  := coalesce(nullif(p.business_name, ''), nullif(new.customer->>'name', ''), p.full_name, 'Guest');
  v_phone := coalesce(nullif(new.customer->>'phone', ''), p.phone, '');
  v_pay := case new.payment_method
    when 'credit'   then 'ON CREDIT - due ' || coalesce(to_char(new.due_date, 'DD Mon YYYY'), '?')
    when 'momo'     then 'MoMo - Transaction ID ' || coalesce(new.payment_ref, '?') || ' (CHECK MoMo statement)'
    when 'bank'     then 'Bank/cheque - ' || coalesce(new.payment_ref, 'slip to follow') || ' (CHECK bank statement)'
    when 'online'   then 'Paid online (Paystack) - ref ' || coalesce(new.payment_ref, new.ref) || ' (CHECK Paystack)'
    else 'WhatsApp order - payment to be arranged'
  end;

  perform private.send_whatsapp('order', concat_ws(E'\n',
    'NEW ORDER ' || new.ref,
    'Customer: ' || v_name || case when v_phone <> '' then ' (' || v_phone || ')' else '' end,
    case when p.id is not null then 'Account: ' || p.email || ' [' || p.status || ']' end,
    '',
    v_items,
    '',
    'Subtotal: GHS ' || to_char(new.subtotal, 'FM999G999G990D00'),
    'Delivery: ' || case when new.delivery_fee = 0 then 'FREE' else 'GHS ' || to_char(new.delivery_fee, 'FM999G999G990D00') end,
    'TOTAL: GHS ' || to_char(new.total, 'FM999G999G990D00'),
    'Payment: ' || v_pay,
    '',
    case when new.delivery->>'method' = 'pickup' then 'Pickup at office'
         else 'Deliver to: ' || coalesce(new.delivery->>'zone', '') || ' - ' || coalesce(new.delivery->>'address', '') end,
    case when coalesce(new.delivery->>'gps', '') <> '' then 'Digital address: ' || (new.delivery->>'gps') end,
    case when coalesce(new.delivery->>'notes', '') <> '' then 'Notes: ' || (new.delivery->>'notes') end,
    case when v_site is not null then 'Manage: ' || v_site || '/admin' end
  ));
  return new;
end;
$$;

drop trigger if exists order_whatsapp_alert on public.orders;
create trigger order_whatsapp_alert
  after insert on public.orders
  for each row execute function private.order_alert();

-- ---------------------------------------------------------------------------
-- 6. Alert: new account waiting for approval
-- ---------------------------------------------------------------------------
create or replace function private.account_alert()
returns trigger
language plpgsql security definer set search_path = private, public
as $$
declare v_site text;
begin
  select site_url into v_site from private.whatsapp_settings where id;
  perform private.send_whatsapp('account', concat_ws(E'\n',
    'NEW ACCOUNT - needs approval',
    case when new.account_type = 'institution'
         then 'Business: ' || coalesce(new.business_name, '?') || ' (' || coalesce(new.business_type, '?') || ')' end,
    case when coalesce(new.registration_number, '') <> '' then 'Reg/TIN: ' || new.registration_number end,
    'Name: ' || coalesce(nullif(new.full_name, ''), '?') || case when coalesce(new.contact_role, '') <> '' then ' - ' || new.contact_role else '' end,
    'Phone: ' || coalesce(nullif(new.phone, ''), '?'),
    'Email: ' || coalesce(new.email, '?'),
    'Location: ' || concat_ws(', ', nullif(new.address, ''), nullif(new.city, ''), nullif(new.gps, '')),
    case when new.requested_credit > 0 then 'Requested credit: GHS ' || to_char(new.requested_credit, 'FM999G999G990D00') end,
    case when v_site is not null then 'Approve: ' || v_site || '/admin' end
  ));
  return new;
end;
$$;

drop trigger if exists account_whatsapp_alert on public.profiles;
create trigger account_whatsapp_alert
  after insert on public.profiles
  for each row execute function private.account_alert();

-- ---------------------------------------------------------------------------
-- 7. SAVE YOUR WHATSAPP ALERT KEY (run once, after getting the key — see README)
--    Replace YOUR_CALLMEBOT_KEY with the key CallMeBot sends you on WhatsApp.
-- ---------------------------------------------------------------------------
-- insert into private.whatsapp_settings (id, provider, phone, callmebot_key)
-- values (true, 'callmebot', '+233256116151', 'YOUR_CALLMEBOT_KEY')
-- on conflict (id) do update set provider = excluded.provider, phone = excluded.phone,
--   callmebot_key = excluded.callmebot_key, enabled = true;
--
-- Send a test message:
-- select private.send_whatsapp('test', 'Test from Evaclear website - alerts are working.');
--
-- See what was sent:
-- select * from private.whatsapp_log order by id desc limit 20;
