-- =============================================================================
-- Evaclear: invoices, payment receipts, statements and delivery confirmation
--   • customers report payments they have made (MoMo, bank, cheque, cash)
--   • staff confirm them → the payment is applied to the customer's invoices
--     and a numbered receipt (RCT-2026-00001) is issued
--   • customers confirm when an order has been received, or report a problem
--
-- Run this AFTER schema.sql and notifications.sql:
--   Supabase → SQL Editor → New query → paste this whole file → Run.
-- Safe to re-run.
-- =============================================================================

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 1. Orders: customer confirms the order arrived (or reports a problem)
-- ---------------------------------------------------------------------------
alter table public.orders add column if not exists received_at     timestamptz;
alter table public.orders add column if not exists received_status text;
alter table public.orders add column if not exists received_note   text;
do $$ begin
  alter table public.orders add constraint orders_received_status_check
    check (received_status is null or received_status in ('received', 'issue'));
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- 2. Payments (reported by customers or recorded by staff)
-- ---------------------------------------------------------------------------
create sequence if not exists public.receipt_seq;

create table if not exists public.payments (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  user_id       uuid not null references public.profiles (id) on delete cascade,
  order_id      uuid references public.orders (id) on delete set null,   -- invoice the customer chose (optional)
  amount        numeric(12, 2) not null check (amount > 0),
  method        text not null check (method in ('momo', 'bank_transfer', 'bank_deposit', 'cheque', 'cash', 'card')),
  reference     text,                                                    -- MoMo transaction ID, bank ref, cheque no.
  paid_on       date not null default current_date,
  note          text,
  status        text not null default 'submitted' check (status in ('submitted', 'confirmed', 'rejected')),
  recorded_by   text not null default 'customer' check (recorded_by in ('customer', 'staff')),
  receipt_no    text unique,
  allocations   jsonb not null default '[]'::jsonb,                      -- [{order_id, ref, amount}]
  unallocated   numeric(12, 2) not null default 0,
  confirmed_at  timestamptz,
  reviewed_by   uuid,
  admin_note    text
);
create index if not exists payments_user_idx on public.payments (user_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

alter table public.payments enable row level security;
drop policy if exists "payments: read own or admin" on public.payments;
create policy "payments: read own or admin" on public.payments
  for select using (user_id = auth.uid() or public.is_admin());
-- No insert/update/delete policies: payments only change through the functions below.
grant select on public.payments to authenticated;
revoke insert, update, delete on public.payments from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Apply a confirmed payment to invoices
--    The invoice the customer chose first, then the oldest unpaid invoices.
-- ---------------------------------------------------------------------------
create or replace function private.apply_payment(p_payment_id uuid)
returns public.payments
language plpgsql security definer set search_path = public, private
as $$
declare
  p       public.payments;
  o       public.orders;
  v_left  numeric;
  v_apply numeric;
  v_alloc jsonb := '[]'::jsonb;
begin
  select * into p from public.payments where id = p_payment_id for update;
  v_left := p.amount;

  if p.order_id is not null then
    select * into o from public.orders
     where id = p.order_id and user_id = p.user_id and payment_method = 'credit' and status <> 'cancelled'
     for update;
    if found then
      v_apply := least(greatest(o.total - o.amount_paid, 0), v_left);
      if v_apply > 0 then
        update public.orders set amount_paid = amount_paid + v_apply where id = o.id;
        v_alloc := v_alloc || jsonb_build_object('order_id', o.id, 'ref', o.ref, 'amount', v_apply);
        v_left := v_left - v_apply;
      end if;
    end if;
  end if;

  for o in
    select * from public.orders
     where user_id = p.user_id and payment_method = 'credit' and status <> 'cancelled' and total > amount_paid
     order by coalesce(due_date, created_at::date), created_at
     for update
  loop
    exit when v_left <= 0;
    v_apply := least(o.total - o.amount_paid, v_left);
    update public.orders set amount_paid = amount_paid + v_apply where id = o.id;
    v_alloc := v_alloc || jsonb_build_object('order_id', o.id, 'ref', o.ref, 'amount', v_apply);
    v_left := v_left - v_apply;
  end loop;

  update public.payments
     set status       = 'confirmed',
         confirmed_at = now(),
         reviewed_by  = auth.uid(),
         allocations  = v_alloc,
         unallocated  = greatest(v_left, 0),
         receipt_no   = coalesce(receipt_no, 'RCT-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('public.receipt_seq')::text, 5, '0'))
   where id = p.id
   returning * into p;
  return p;
end;
$$;
revoke all on function private.apply_payment(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Customer: "I have made a payment"
-- ---------------------------------------------------------------------------
create or replace function public.report_payment(
  p_amount numeric, p_method text, p_reference text, p_paid_on date,
  p_order_id uuid default null, p_note text default null
)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare
  v_owed numeric;
  v_p    public.payments;
begin
  if auth.uid() is null then
    raise exception 'Please log in to record a payment.';
  end if;
  if p_method not in ('momo', 'bank_transfer', 'bank_deposit', 'cheque', 'cash') then
    raise exception 'Choose how you paid.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter the amount you paid.';
  end if;
  if p_method <> 'cash' and length(trim(coalesce(p_reference, ''))) < 3 then
    raise exception 'Enter the transaction ID, bank reference or cheque number.';
  end if;
  if p_paid_on is null or p_paid_on > current_date or p_paid_on < current_date - 365 then
    raise exception 'Enter the date you paid (not in the future).';
  end if;
  if (select count(*) from public.payments where user_id = auth.uid() and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Too many payments recorded in a short time. Please contact us on WhatsApp.';
  end if;
  if p_order_id is not null and not exists (
    select 1 from public.orders where id = p_order_id and user_id = auth.uid() and payment_method = 'credit' and status <> 'cancelled'
  ) then
    raise exception 'That invoice was not found on your account.';
  end if;

  select coalesce(sum(total - amount_paid), 0) into v_owed
    from public.orders
   where user_id = auth.uid() and payment_method = 'credit' and status <> 'cancelled' and total > amount_paid;
  if v_owed <= 0 then
    raise exception 'There is no balance to pay on your account.';
  end if;
  if p_amount > v_owed + 0.009 then
    raise exception 'The amount (GHS %) is more than you owe (GHS %).', p_amount, v_owed;
  end if;

  insert into public.payments (user_id, order_id, amount, method, reference, paid_on, note)
  values (auth.uid(), p_order_id, round(p_amount, 2), p_method, nullif(trim(p_reference), ''), p_paid_on, nullif(trim(p_note), ''))
  returning * into v_p;
  return v_p;
end;
$$;
grant execute on function public.report_payment(numeric, text, text, date, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. Staff: confirm (issue receipt), reject, or record a payment received
-- ---------------------------------------------------------------------------
create or replace function public.confirm_payment(p_payment_id uuid, p_amount numeric default null, p_note text default null)
returns public.payments
language plpgsql security definer set search_path = public, private
as $$
declare v_p public.payments;
begin
  if not public.is_admin() then
    raise exception 'Only Evaclear staff can confirm payments.';
  end if;
  select * into v_p from public.payments where id = p_payment_id for update;
  if not found then
    raise exception 'Payment not found.';
  end if;
  if v_p.status <> 'submitted' then
    raise exception 'This payment has already been %.', v_p.status;
  end if;
  if p_amount is not null then
    if p_amount <= 0 then
      raise exception 'Enter the amount that actually arrived.';
    end if;
    update public.payments set amount = round(p_amount, 2) where id = p_payment_id;
  end if;
  update public.payments set admin_note = coalesce(nullif(trim(p_note), ''), admin_note) where id = p_payment_id;
  return private.apply_payment(p_payment_id);
end;
$$;
grant execute on function public.confirm_payment(uuid, numeric, text) to authenticated;

create or replace function public.reject_payment(p_payment_id uuid, p_note text default null)
returns public.payments
language plpgsql security definer set search_path = public
as $$
declare v_p public.payments;
begin
  if not public.is_admin() then
    raise exception 'Only Evaclear staff can reject payments.';
  end if;
  update public.payments
     set status = 'rejected', reviewed_by = auth.uid(), confirmed_at = now(),
         admin_note = coalesce(nullif(trim(p_note), ''), 'We could not find this payment. Please contact us.')
   where id = p_payment_id and status = 'submitted'
   returning * into v_p;
  if not found then
    raise exception 'Only payments that are still being checked can be rejected.';
  end if;
  return v_p;
end;
$$;
grant execute on function public.reject_payment(uuid, text) to authenticated;

create or replace function public.admin_record_payment(
  p_user uuid, p_amount numeric, p_method text, p_reference text default null,
  p_paid_on date default current_date, p_order_id uuid default null, p_note text default null
)
returns public.payments
language plpgsql security definer set search_path = public, private
as $$
declare v_p public.payments;
begin
  if not public.is_admin() then
    raise exception 'Only Evaclear staff can record payments.';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter the amount received.';
  end if;
  insert into public.payments (user_id, order_id, amount, method, reference, paid_on, recorded_by, admin_note)
  values (p_user, p_order_id, round(p_amount, 2), coalesce(p_method, 'cash'), nullif(trim(p_reference), ''),
          coalesce(p_paid_on, current_date), 'staff', nullif(trim(p_note), ''))
  returning * into v_p;
  return private.apply_payment(v_p.id);
end;
$$;
grant execute on function public.admin_record_payment(uuid, numeric, text, text, date, uuid, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Customer: confirm an order was received, or report a problem
-- ---------------------------------------------------------------------------
create or replace function public.confirm_order_received(p_order_id uuid, p_status text default 'received', p_note text default null)
returns public.orders
language plpgsql security definer set search_path = public
as $$
declare v_o public.orders;
begin
  if auth.uid() is null then
    raise exception 'Please log in first.';
  end if;
  if p_status not in ('received', 'issue') then
    raise exception 'Unknown option.';
  end if;
  if p_status = 'issue' and length(trim(coalesce(p_note, ''))) < 3 then
    raise exception 'Tell us briefly what went wrong.';
  end if;
  select * into v_o from public.orders where id = p_order_id and user_id = auth.uid() for update;
  if not found then
    raise exception 'Order not found on your account.';
  end if;
  if v_o.status = 'cancelled' then
    raise exception 'This order was cancelled.';
  end if;
  if v_o.received_status = 'received' then
    raise exception 'You have already confirmed this order as received.';
  end if;

  update public.orders
     set received_status = p_status,
         received_at     = now(),
         received_note   = nullif(trim(p_note), ''),
         status          = case when p_status = 'received' then 'delivered' else status end
   where id = p_order_id
   returning * into v_o;
  return v_o;
end;
$$;
grant execute on function public.confirm_order_received(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. WhatsApp alerts to the company (uses notifications.sql if installed)
-- ---------------------------------------------------------------------------
create or replace function private.notify(p_kind text, p_message text)
returns void
language plpgsql security definer set search_path = private, public
as $$
begin
  execute 'select private.send_whatsapp($1, $2)' using p_kind, p_message;
exception when others then
  null;  -- alerts not set up yet, or failed: never block the customer
end;
$$;

create or replace function private.payment_alert()
returns trigger
language plpgsql security definer set search_path = private, public
as $$
declare
  pr public.profiles;
  v_ref text;
  v_site text;
begin
  if new.recorded_by <> 'customer' then
    return new;
  end if;
  select * into pr from public.profiles where id = new.user_id;
  select ref into v_ref from public.orders where id = new.order_id;
  begin
    execute 'select site_url from private.whatsapp_settings where id' into v_site;
  exception when others then v_site := null;
  end;
  perform private.notify('payment', concat_ws(E'\n',
    'PAYMENT REPORTED - please check',
    'Customer: ' || coalesce(nullif(pr.business_name, ''), pr.full_name, '?') || ' (' || coalesce(pr.phone, '') || ')',
    'Amount: GHS ' || to_char(new.amount, 'FM999G999G990D00'),
    'Method: ' || case new.method when 'momo' then 'MoMo' when 'bank_transfer' then 'Bank transfer'
      when 'bank_deposit' then 'Bank deposit' when 'cheque' then 'Cheque' else 'Cash' end,
    case when new.reference is not null then 'Reference: ' || new.reference end,
    'Paid on: ' || to_char(new.paid_on, 'DD Mon YYYY'),
    'For: ' || coalesce('invoice INV-' || v_ref, 'oldest invoices'),
    case when new.note is not null then 'Note: ' || new.note end,
    case when v_site is not null then 'Confirm: ' || v_site || '/admin' end
  ));
  return new;
end;
$$;

drop trigger if exists payment_whatsapp_alert on public.payments;
create trigger payment_whatsapp_alert
  after insert on public.payments
  for each row execute function private.payment_alert();

create or replace function private.received_alert()
returns trigger
language plpgsql security definer set search_path = private, public
as $$
declare pr public.profiles;
begin
  if new.received_status is not distinct from old.received_status then
    return new;
  end if;
  select * into pr from public.profiles where id = new.user_id;
  perform private.notify('received', concat_ws(E'\n',
    case when new.received_status = 'received' then 'ORDER RECEIVED ' || new.ref
         else 'PROBLEM WITH ORDER ' || new.ref end,
    'Customer: ' || coalesce(nullif(pr.business_name, ''), pr.full_name, new.customer->>'name', '?')
      || ' (' || coalesce(pr.phone, new.customer->>'phone', '') || ')',
    case when new.received_note is not null then 'Note: ' || new.received_note end
  ));
  return new;
end;
$$;

drop trigger if exists order_received_alert on public.orders;
create trigger order_received_alert
  after update of received_status on public.orders
  for each row execute function private.received_alert();
