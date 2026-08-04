-- claim_dispatch_request failed when updating dispatch_offers.status (text vs enum).

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
