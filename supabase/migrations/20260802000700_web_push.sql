-- Web push nudge for the exclusive offer window. Sized as its own small
-- subsystem: subscription storage, a superadmin-editable config table for
-- the (deployment-specific) push endpoint, and an async trigger that fires
-- when a new exclusive offer is created. The trigger no-ops silently until
-- an operator configures the endpoint — this must never block dispatch.

-- pg_net's install script creates and manages its own `net` schema
-- internally regardless of which schema the extension record itself is
-- associated with; reference net.http_post directly below.
create extension if not exists pg_net;

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "user manages own push subscriptions" on public.push_subscriptions;
create policy "user manages own push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon;
grant select, insert, delete on public.push_subscriptions to authenticated;

-- Small, superadmin-only settings table. Holds the deployment's public
-- push-send endpoint and the shared secret the DB trigger presents to it —
-- both are environment-specific (there's no fixed URL to hardcode), so
-- this is deliberately data, not a migration constant.
create table if not exists public.app_config (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;

drop policy if exists "superadmin manages app config" on public.app_config;
create policy "superadmin manages app config"
  on public.app_config for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'superadmin'))
  with check (exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'superadmin'));

revoke all on public.app_config from anon;
grant select, insert, update on public.app_config to authenticated;

insert into public.app_config (key, value)
values ('push_endpoint_url', null), ('push_internal_secret', null)
on conflict (key) do nothing;

create or replace function public.notify_new_dispatch_offer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_endpoint text;
  v_secret text;
begin
  if new.status <> 'pending' then
    return new;
  end if;

  select value into v_endpoint from public.app_config where key = 'push_endpoint_url';
  select value into v_secret from public.app_config where key = 'push_internal_secret';

  if v_endpoint is null or v_endpoint = '' or v_secret is null or v_secret = '' then
    return new;
  end if;

  perform net.http_post(
    url := v_endpoint,
    body := jsonb_build_object(
      'company_id', new.company_id,
      'service_request_id', new.service_request_id,
      'offer_id', new.id
    ),
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', v_secret),
    timeout_milliseconds := 5000
  );

  return new;
exception
  when others then
    -- Never let a push-notification failure break dispatch.
    return new;
end;
$$;

drop trigger if exists dispatch_offer_push_nudge on public.dispatch_offers;
create trigger dispatch_offer_push_nudge
  after insert on public.dispatch_offers
  for each row execute function public.notify_new_dispatch_offer();
