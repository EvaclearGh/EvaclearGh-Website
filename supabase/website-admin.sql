-- =============================================================================
-- Evaclear: "Publish website now" button in the Staff dashboard (/admin → Website)
--
-- The button asks Netlify to rebuild and publish the site, picking up everything
-- saved in the website editor (/cms). Only staff accounts can press it.
--
-- Run this once in Supabase → SQL Editor (after schema.sql). Safe to re-run.
-- Then save your Netlify build hook address (see the bottom of this file).
-- =============================================================================

create extension if not exists pg_net with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create table if not exists private.site_settings (
  id                 boolean primary key default true check (id),
  netlify_build_hook text            -- https://api.netlify.com/build_hooks/xxxxxxxx
);

create table if not exists private.publish_log (
  id          bigserial primary key,
  created_at  timestamptz not null default now(),
  user_id     uuid,
  email       text,
  note        text,
  request_id  bigint
);

-- Staff only: start a publish (at most once a minute)
create or replace function public.publish_site(p_note text default null)
returns jsonb
language plpgsql security definer set search_path = public, private, extensions
as $$
declare
  v_hook  text;
  v_email text;
  v_id    bigint;
  v_last  timestamptz;
begin
  if not public.is_admin() then
    raise exception 'Only Evaclear staff can publish the website.';
  end if;
  select netlify_build_hook into v_hook from private.site_settings where id;
  if coalesce(v_hook, '') = '' then
    raise exception 'Publishing is not set up yet: save the Netlify build hook in Supabase (see supabase/website-admin.sql).';
  end if;
  select max(created_at) into v_last from private.publish_log;
  if v_last > now() - interval '60 seconds' then
    raise exception 'The website is already being published. Please wait a minute.';
  end if;
  select email into v_email from public.profiles where id = auth.uid();

  select net.http_post(
    url     := v_hook || '?trigger_title=' || replace(regexp_replace(left('Published by ' || coalesce(v_email, 'staff') || coalesce(' - ' || nullif(trim(p_note), ''), ''), 120), '[^A-Za-z0-9@._ -]', '', 'g'), ' ', '+'),
    body    := '{}'::jsonb,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 10000
  ) into v_id;

  insert into private.publish_log (user_id, email, note, request_id)
  values (auth.uid(), v_email, nullif(trim(p_note), ''), v_id);
  return jsonb_build_object('ok', true, 'at', now());
end;
$$;
grant execute on function public.publish_site(text) to authenticated;

-- Staff only: is publishing set up, and the last few publishes
create or replace function public.publish_status()
returns jsonb
language plpgsql stable security definer set search_path = public, private
as $$
begin
  if not public.is_admin() then
    raise exception 'Staff only.';
  end if;
  return jsonb_build_object(
    'configured', exists (select 1 from private.site_settings where id and coalesce(netlify_build_hook, '') <> ''),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('at', created_at, 'email', email, 'note', note) order by created_at desc)
      from (select * from private.publish_log order by created_at desc limit 8) l
    ), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.publish_status() to authenticated;

-- ---------------------------------------------------------------------------
-- SAVE YOUR NETLIFY BUILD HOOK (once):
--   Netlify → your site → Site configuration → Build & deploy → Build hooks →
--   Add build hook (name: "Publish button", branch: main) → copy the address, then run:
--
-- insert into private.site_settings (id, netlify_build_hook)
-- values (true, 'https://api.netlify.com/build_hooks/PASTE_YOUR_HOOK_ID')
-- on conflict (id) do update set netlify_build_hook = excluded.netlify_build_hook;
-- ---------------------------------------------------------------------------
