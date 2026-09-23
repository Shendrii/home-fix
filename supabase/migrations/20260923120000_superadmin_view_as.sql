-- Superadmin view-as. Callers stay signed in as themselves. Optional company
-- and client ids are honored only when is_superadmin() is true; every other
-- caller still resolves the company with owner_id = auth.uid().

drop function if exists public.respond_to_dispatch_offer(uuid, text, text);
drop function if exists public.claim_dispatch_request(uuid, uuid);
drop function if exists public.set_company_availability(boolean);
drop function if exists public.partner_job_earnings();
drop function if exists public.update_service_request_status(uuid, public.request_status, text);

create or replace function public.set_company_availability(
  p_available boolean,
  p_company_id uuid default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_company public.companies;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.is_superadmin() and p_company_id is not null then
    update public.companies
    set is_available = p_available,
        last_online_at = case when p_available then now() else last_online_at end,
        updated_at = now()
    where id = p_company_id
    returning * into updated_company;
  else
    update public.companies
    set is_available = p_available,
        last_online_at = case when p_available then now() else last_online_at end,
        updated_at = now()
    where owner_id = auth.uid()
    returning * into updated_company;
  end if;

  if not found then raise exception 'Partner company not found'; end if;
  return updated_company;
end;
$$;

create or replace function public.claim_dispatch_request(
  p_request_id uuid,
  p_offer_id uuid default null,
  p_company_id uuid default null
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
  acting boolean;
begin
  acting := public.is_superadmin() and p_company_id is not null;

  if acting then
    select * into company_row
    from public.companies
    where id = p_company_id
    for update;
  else
    select * into company_row
    from public.companies
    where owner_id = auth.uid()
    for update;
  end if;

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
  set status = case
        when id = p_offer_id then 'accepted'::public.dispatch_offer_status
        else 'superseded'::public.dispatch_offer_status
      end,
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
    case
      when acting then 'Accepted by superadmin while viewing as this company'
      else 'Accepted through qualified partner dispatch'
    end,
    auth.uid(),
    jsonb_build_object(
      'dispatch_phase', request_row.dispatch_phase,
      'acted_as_company_id', case when acting then company_row.id else null end
    )
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
  p_action text,
  p_decline_reason text default null,
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.dispatch_offers;
  acting boolean;
begin
  acting := public.is_superadmin() and p_company_id is not null;

  select o.* into offer_row
  from public.dispatch_offers o
  join public.companies c on c.id = o.company_id
  where o.id = p_offer_id
    and (
      (acting and o.company_id = p_company_id)
      or (not acting and c.owner_id = auth.uid())
    )
  for update;
  if not found then return jsonb_build_object('status', 'not_eligible'); end if;

  if p_action = 'accept' then
    return public.claim_dispatch_request(offer_row.service_request_id, offer_row.id, case when acting then p_company_id else null end);
  end if;

  if p_action <> 'decline' then
    return jsonb_build_object('status', 'invalid_action');
  end if;

  if p_decline_reason is not null and p_decline_reason not in ('too_far', 'wrong_category', 'unavailable', 'other') then
    p_decline_reason := 'other';
  end if;

  update public.dispatch_offers
  set status = 'declined', responded_at = now(), decline_reason = p_decline_reason
  where id = offer_row.id
    and status in ('pending', 'viewed');
  if not found then return jsonb_build_object('status', 'offer_expired'); end if;
  return jsonb_build_object('status', 'declined');
end;
$$;

create or replace function public.partner_job_earnings(p_company_id uuid default null)
returns table (
  service_request_id uuid,
  reference_code text,
  title text,
  completed_at timestamptz,
  accepted_at timestamptz,
  hours_worked numeric,
  final_price_cents integer
)
language sql
stable
security definer
set search_path = public
as $$
  select
    request.id,
    request.reference_code,
    request.title,
    history.completed_at,
    assignment.accepted_at,
    round(
      extract(epoch from (history.completed_at - assignment.accepted_at)) / 3600.0,
      2
    ) as hours_worked,
    request.final_price_cents
  from public.service_requests request
  join public.companies company on company.id = request.accepted_company_id
  join public.job_assignments assignment on assignment.service_request_id = request.id
  join lateral (
    select h.created_at as completed_at
    from public.request_status_history h
    where h.service_request_id = request.id and h.status = 'completed'
    order by h.created_at desc
    limit 1
  ) history on true
  where request.status = 'completed'
    and company.id = coalesce(
      case when public.is_superadmin() then p_company_id else null end,
      (select owned.id from public.companies owned where owned.owner_id = auth.uid() limit 1)
    );
$$;

create or replace function public.update_service_request_status(
  p_request_id uuid,
  p_status public.request_status,
  p_note text default null,
  p_company_id uuid default null,
  p_client_id uuid default null
)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_request public.service_requests;
  updated_request public.service_requests;
  is_assigned_partner boolean;
  partner_transition boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select * into current_request
  from public.service_requests
  where id = p_request_id
  for update;

  if not found then
    raise exception 'Request not found';
  end if;

  partner_transition :=
    (current_request.status = 'assigned' and p_status in ('scheduled', 'en_route', 'cancelled'))
    or (current_request.status = 'scheduled' and p_status in ('en_route', 'cancelled'))
    or (current_request.status = 'en_route' and p_status in ('in_progress', 'cancelled'))
    or (current_request.status = 'in_progress' and p_status in ('completed', 'cancelled'));

  if public.is_admin() then
    null;
  elsif public.is_superadmin()
    and p_client_id is not null
    and p_client_id = current_request.client_id
    and current_request.status = 'open'
    and p_status = 'cancelled' then
    null;
  elsif public.is_superadmin()
    and p_company_id is not null
    and p_company_id = current_request.accepted_company_id then
    if not partner_transition then
      raise exception 'Invalid request status transition';
    end if;
  elsif current_request.client_id = auth.uid()
    and current_request.status = 'open'
    and p_status = 'cancelled' then
    null;
  else
    select exists (
      select 1 from public.companies
      where id = current_request.accepted_company_id and owner_id = auth.uid()
    ) into is_assigned_partner;

    if not is_assigned_partner then
      raise exception 'You cannot update this request';
    end if;

    if not partner_transition then
      raise exception 'Invalid request status transition';
    end if;
  end if;

  update public.service_requests
  set
    status = p_status,
    final_price_cents = case
      when p_status = 'completed' and final_price_cents is null then estimated_price_cents
      else final_price_cents
    end
  where id = p_request_id
  returning * into updated_request;

  insert into public.request_status_history (service_request_id, status, note, created_by)
  values (p_request_id, p_status, p_note, auth.uid());

  return updated_request;
end;
$$;

create or replace function public.superadmin_create_service_request(
  p_client_id uuid,
  p_service_category_id uuid,
  p_title text,
  p_description text,
  p_address text,
  p_urgency text,
  p_estimated_price_cents integer,
  p_latitude numeric default null,
  p_longitude numeric default null,
  p_preferred_start_at timestamptz default null,
  p_preferred_end_at timestamptz default null
)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  created public.service_requests;
begin
  if not public.is_superadmin() then
    raise exception 'Only superadmins can create a request for another homeowner';
  end if;
  if not exists (
    select 1 from public.profiles
    where id = p_client_id and role = 'client'
  ) then
    raise exception 'Homeowner not found';
  end if;
  if p_urgency not in ('standard', 'urgent') then
    raise exception 'Invalid urgency';
  end if;

  insert into public.service_requests (
    client_id,
    service_category_id,
    title,
    description,
    address,
    urgency,
    estimated_price_cents,
    latitude,
    longitude,
    preferred_start_at,
    preferred_end_at,
    status,
    accepted_company_id
  )
  values (
    p_client_id,
    p_service_category_id,
    p_title,
    p_description,
    p_address,
    p_urgency::public.request_urgency,
    p_estimated_price_cents,
    p_latitude,
    p_longitude,
    p_preferred_start_at,
    p_preferred_end_at,
    'open',
    null
  )
  returning * into created;

  return created;
end;
$$;

revoke all on function public.set_company_availability(boolean, uuid) from public, anon;
revoke all on function public.claim_dispatch_request(uuid, uuid, uuid) from public, anon;
revoke all on function public.respond_to_dispatch_offer(uuid, text, text, uuid) from public, anon;
revoke all on function public.partner_job_earnings(uuid) from public, anon;
revoke all on function public.update_service_request_status(uuid, public.request_status, text, uuid, uuid) from public, anon;
revoke all on function public.superadmin_create_service_request(uuid, uuid, text, text, text, text, integer, numeric, numeric, timestamptz, timestamptz) from public, anon;

grant execute on function public.set_company_availability(boolean, uuid) to authenticated;
grant execute on function public.claim_dispatch_request(uuid, uuid, uuid) to authenticated;
grant execute on function public.respond_to_dispatch_offer(uuid, text, text, uuid) to authenticated;
grant execute on function public.partner_job_earnings(uuid) to authenticated;
grant execute on function public.update_service_request_status(uuid, public.request_status, text, uuid, uuid) to authenticated;
grant execute on function public.superadmin_create_service_request(uuid, uuid, text, text, text, text, integer, numeric, numeric, timestamptz, timestamptz) to authenticated;
