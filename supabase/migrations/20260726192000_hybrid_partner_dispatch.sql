-- Qualified-first hybrid dispatch: timed offers to eligible on-duty partners,
-- followed by a broadcast queue when no exclusive offer is claimed.

do $$
begin
  create type public.dispatch_phase as enum (
    'qualifying', 'exclusive_offers', 'broadcast', 'assigned', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$
begin
  create type public.dispatch_offer_status as enum (
    'pending', 'viewed', 'accepted', 'declined', 'expired', 'superseded'
  );
exception when duplicate_object then null;
end $$;

alter table public.service_requests
  add column if not exists dispatch_phase public.dispatch_phase not null default 'qualifying',
  add column if not exists dispatch_started_at timestamptz,
  add column if not exists broadcast_at timestamptz;

alter table public.companies
  add column if not exists base_latitude numeric,
  add column if not exists base_longitude numeric,
  add column if not exists service_radius_km numeric not null default 25,
  add column if not exists max_concurrent_jobs integer not null default 3,
  add column if not exists last_online_at timestamptz;

alter table public.request_status_history
  add column if not exists metadata jsonb not null default '{}'::jsonb;

create table if not exists public.dispatch_offers (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  rank_score numeric not null,
  rank_explanation jsonb not null default '{}'::jsonb,
  status public.dispatch_offer_status not null default 'pending',
  exclusive_until timestamptz not null,
  viewed_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  unique (service_request_id, company_id)
);

create index if not exists dispatch_offers_company_active_idx
  on public.dispatch_offers(company_id, exclusive_until desc)
  where status in ('pending', 'viewed');
create index if not exists dispatch_offers_request_idx
  on public.dispatch_offers(service_request_id, created_at);
create index if not exists service_requests_dispatch_open_idx
  on public.service_requests(dispatch_phase, created_at)
  where status = 'open';

alter table public.dispatch_offers enable row level security;

drop policy if exists "partners view own dispatch offers" on public.dispatch_offers;
create policy "partners view own dispatch offers"
  on public.dispatch_offers for select to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = dispatch_offers.company_id
        and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "operations view dispatch offers" on public.dispatch_offers;
create policy "operations view dispatch offers"
  on public.dispatch_offers for select to authenticated
  using (
    exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
  );

-- A request may be visible to a partner only when it is assigned to their
-- company, broadcast to its verified category, or has an active offer to it.
drop policy if exists "clients and eligible partners view requests" on public.service_requests;
create policy "clients and eligible partners view requests"
  on public.service_requests for select to authenticated
  using (
    client_id = (select auth.uid())
    or exists (
      select 1 from public.companies c
      where c.id = service_requests.accepted_company_id
        and c.owner_id = (select auth.uid())
    )
    or (
      service_requests.status = 'open'
      and service_requests.dispatch_phase = 'broadcast'
      and exists (
        select 1
        from public.companies c
        join public.company_services cs on cs.company_id = c.id
        where c.owner_id = (select auth.uid())
          and c.verification_status = 'verified'
          and c.is_available
          and cs.service_category_id = service_requests.service_category_id
      )
    )
    or exists (
      select 1
      from public.dispatch_offers o
      join public.companies c on c.id = o.company_id
      where o.service_request_id = service_requests.id
        and c.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
  );

create or replace function public.start_dispatch(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.service_requests;
  selected_count integer;
begin
  select * into request_row
  from public.service_requests
  where id = p_request_id and status = 'open'
  for update;
  if not found then return; end if;

  update public.dispatch_offers
  set status = 'superseded', responded_at = now()
  where service_request_id = p_request_id
    and status in ('pending', 'viewed');

  with candidate_companies as (
    select
      c.id,
      (
        100
        + least(c.average_rating, 5) * 5
        - (
          select count(*)
          from public.service_requests active_request
          where active_request.accepted_company_id = c.id
            and active_request.status in ('assigned', 'scheduled', 'en_route', 'in_progress')
        ) * 12
        - coalesce(
          (
            6371 * acos(
              least(1, greatest(-1,
                cos(radians(request_row.latitude::double precision))
                * cos(radians(c.base_latitude::double precision))
                * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
                + sin(radians(request_row.latitude::double precision))
                * sin(radians(c.base_latitude::double precision))
              ))
            )
          ),
          10
        )
      )::numeric as score,
      coalesce(
        (
          6371 * acos(
            least(1, greatest(-1,
              cos(radians(request_row.latitude::double precision))
              * cos(radians(c.base_latitude::double precision))
              * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
              + sin(radians(request_row.latitude::double precision))
              * sin(radians(c.base_latitude::double precision))
            ))
          )
        ),
        null
      ) as distance_km
    from public.companies c
    join public.company_services cs on cs.company_id = c.id
    where c.verification_status = 'verified'
      and c.is_available
      and cs.service_category_id = request_row.service_category_id
      and (
        select count(*)
        from public.service_requests active_request
        where active_request.accepted_company_id = c.id
          and active_request.status in ('assigned', 'scheduled', 'en_route', 'in_progress')
      ) < c.max_concurrent_jobs
      and (
        request_row.latitude is null
        or c.base_latitude is null
        or c.base_longitude is null
        or (
          6371 * acos(
            least(1, greatest(-1,
              cos(radians(request_row.latitude::double precision))
              * cos(radians(c.base_latitude::double precision))
              * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
              + sin(radians(request_row.latitude::double precision))
              * sin(radians(c.base_latitude::double precision))
            ))
          )
        ) <= c.service_radius_km
      )
    order by score desc, c.id
    limit 5
  )
  insert into public.dispatch_offers (
    service_request_id, company_id, rank_score, rank_explanation, exclusive_until
  )
  select
    p_request_id,
    id,
    score,
    jsonb_build_object(
      'distance_km', distance_km,
      'reason', 'Verified, available, category-qualified partner with capacity'
    ),
    now() + interval '45 seconds'
  from candidate_companies;

  get diagnostics selected_count = row_count;
  update public.service_requests
  set
    dispatch_phase = case
      when selected_count > 0 then 'exclusive_offers'::public.dispatch_phase
      else 'broadcast'::public.dispatch_phase
    end,
    dispatch_started_at = now(),
    broadcast_at = case when selected_count > 0 then null else now() end
  where id = p_request_id;
end;
$$;

create or replace function public.dispatch_on_request_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform public.start_dispatch(new.id);
  return new;
end;
$$;

drop trigger if exists on_service_request_start_dispatch on public.service_requests;
create trigger on_service_request_start_dispatch
  after insert on public.service_requests
  for each row execute function public.dispatch_on_request_created();

create or replace function public.advance_expired_dispatch_offers()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.dispatch_offers
  set status = 'expired', responded_at = now()
  where status in ('pending', 'viewed') and exclusive_until <= now();

  update public.service_requests request_row
  set dispatch_phase = 'broadcast', broadcast_at = now()
  where request_row.status = 'open'
    and request_row.dispatch_phase = 'exclusive_offers'
    and not exists (
      select 1
      from public.dispatch_offers offer
      where offer.service_request_id = request_row.id
        and offer.status in ('pending', 'viewed')
        and offer.exclusive_until > now()
    );
  get diagnostics affected = row_count;
  return affected;
end;
$$;

create or replace function public.set_company_availability(p_available boolean)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_company public.companies;
begin
  update public.companies
  set is_available = p_available,
      last_online_at = case when p_available then now() else last_online_at end,
      updated_at = now()
  where owner_id = auth.uid()
  returning * into updated_company;
  if not found then raise exception 'Partner company not found'; end if;
  return updated_company;
end;
$$;

create or replace function public.claim_dispatch_request(
  p_request_id uuid,
  p_offer_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_row public.companies;
  request_row public.service_requests;
  accepted_request public.service_requests;
begin
  select * into company_row
  from public.companies
  where owner_id = auth.uid()
  for update;
  if not found or company_row.verification_status <> 'verified' then
    return jsonb_build_object('status', 'not_eligible');
  end if;
  if not company_row.is_available then
    return jsonb_build_object('status', 'offline');
  end if;

  select * into request_row
  from public.service_requests
  where id = p_request_id
  for update;
  if not found or request_row.status <> 'open' then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  if not exists (
    select 1 from public.company_services
    where company_id = company_row.id
      and service_category_id = request_row.service_category_id
  ) then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  if (
    request_row.dispatch_phase = 'exclusive_offers'
    and not exists (
      select 1 from public.dispatch_offers
      where id = p_offer_id
        and service_request_id = request_row.id
        and company_id = company_row.id
        and status in ('pending', 'viewed')
        and exclusive_until > now()
    )
  ) then
    return jsonb_build_object('status', 'offer_expired');
  end if;

  if request_row.dispatch_phase not in ('exclusive_offers', 'broadcast') then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  update public.service_requests
  set status = 'assigned',
      dispatch_phase = 'assigned',
      accepted_company_id = company_row.id,
      accepted_at = now(),
      updated_at = now()
  where id = p_request_id and status = 'open'
  returning * into accepted_request;
  if not found then return jsonb_build_object('status', 'already_claimed'); end if;

  update public.dispatch_offers
  set status = case when id = p_offer_id then 'accepted' else 'superseded' end,
      responded_at = now()
  where service_request_id = p_request_id
    and status in ('pending', 'viewed');

  insert into public.job_assignments (service_request_id, company_id, accepted_at)
  values (accepted_request.id, company_row.id, accepted_request.accepted_at)
  on conflict (service_request_id) do nothing;

  insert into public.request_status_history (service_request_id, status, note, created_by, metadata)
  values (
    accepted_request.id,
    'assigned',
    'Accepted through qualified partner dispatch',
    auth.uid(),
    jsonb_build_object('dispatch_phase', request_row.dispatch_phase)
  );

  insert into public.notifications (recipient_id, service_request_id, title, body)
  values (
    accepted_request.client_id,
    accepted_request.id,
    'A qualified partner accepted your request',
    'Your service professional has been assigned. We will update you when the visit is scheduled.'
  );

  return jsonb_build_object(
    'status', 'assigned',
    'request_id', accepted_request.id,
    'company_id', company_row.id
  );
end;
$$;

create or replace function public.respond_to_dispatch_offer(
  p_offer_id uuid,
  p_action text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.dispatch_offers;
begin
  select o.* into offer_row
  from public.dispatch_offers o
  join public.companies c on c.id = o.company_id
  where o.id = p_offer_id and c.owner_id = auth.uid()
  for update;
  if not found then return jsonb_build_object('status', 'not_eligible'); end if;

  if p_action = 'accept' then
    return public.claim_dispatch_request(offer_row.service_request_id, offer_row.id);
  end if;

  if p_action <> 'decline' then
    return jsonb_build_object('status', 'invalid_action');
  end if;

  update public.dispatch_offers
  set status = 'declined', responded_at = now()
  where id = offer_row.id
    and status in ('pending', 'viewed');
  if not found then return jsonb_build_object('status', 'offer_expired'); end if;
  return jsonb_build_object('status', 'declined');
end;
$$;

create or replace function public.mark_dispatch_offer_viewed(p_offer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dispatch_offers o
  set status = 'viewed', viewed_at = coalesce(viewed_at, now())
  from public.companies c
  where o.id = p_offer_id
    and o.company_id = c.id
    and c.owner_id = (select auth.uid())
    and o.status = 'pending';
$$;

create or replace function public.notify_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status <> 'assigned' then
    insert into public.notifications (recipient_id, service_request_id, title, body)
    values (
      new.client_id,
      new.id,
      'Service request updated',
      'Your request is now ' || replace(new.status::text, '_', ' ') || '.'
    );
  end if;
  return new;
end;
$$;

drop trigger if exists on_service_request_notify_status on public.service_requests;
create trigger on_service_request_notify_status
  after update of status on public.service_requests
  for each row execute function public.notify_request_status_change();

-- Existing direct callers keep the same RPC signature but now use the secure
-- hybrid claim path. UI clients should migrate to offer/broadcast RPCs.
create or replace function public.accept_service_request(
  p_request_id uuid,
  p_company_id uuid
)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed jsonb;
  accepted_request public.service_requests;
begin
  if not exists (
    select 1 from public.companies
    where id = p_company_id and owner_id = auth.uid()
  ) then
    raise exception 'You cannot accept requests for this company';
  end if;
  claimed := public.claim_dispatch_request(p_request_id, null);
  if claimed ->> 'status' <> 'assigned' then
    raise exception '%', claimed ->> 'status';
  end if;
  select * into accepted_request from public.service_requests where id = p_request_id;
  return accepted_request;
end;
$$;

revoke all on function public.start_dispatch(uuid) from public, anon, authenticated;
revoke all on function public.advance_expired_dispatch_offers() from public, anon, authenticated;
revoke all on function public.dispatch_on_request_created() from public, anon, authenticated;
revoke all on function public.notify_request_status_change() from public, anon, authenticated;
revoke all on function public.claim_dispatch_request(uuid, uuid) from public, anon;
revoke all on function public.respond_to_dispatch_offer(uuid, text) from public, anon;
revoke all on function public.set_company_availability(boolean) from public, anon;
revoke all on function public.mark_dispatch_offer_viewed(uuid) from public, anon;
revoke all on function public.accept_service_request(uuid, uuid) from public, anon;
grant execute on function public.claim_dispatch_request(uuid, uuid) to authenticated;
grant execute on function public.respond_to_dispatch_offer(uuid, text) to authenticated;
grant execute on function public.set_company_availability(boolean) to authenticated;
grant execute on function public.mark_dispatch_offer_viewed(uuid) to authenticated;
grant execute on function public.accept_service_request(uuid, uuid) to authenticated;

-- Run expiry at minute precision. The function is idempotent and only moves
-- open requests whose reserved offers have actually expired.
create extension if not exists pg_cron;
do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'advance-homefix-dispatch-offers';
exception when undefined_table then null;
end $$;
select cron.schedule(
  'advance-homefix-dispatch-offers',
  '* * * * *',
  'select public.advance_expired_dispatch_offers()'
);
