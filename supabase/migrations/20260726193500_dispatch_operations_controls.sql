-- Operations controls are intentionally constrained to verified, category-qualified
-- companies and produce an auditable history entry for every override.

create or replace function public.admin_manage_dispatch(
  p_request_id uuid,
  p_action text,
  p_company_id uuid default null,
  p_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.service_requests;
  company_row public.companies;
begin
  if not exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin', 'superadmin')
  ) then
    raise exception 'Operations access required';
  end if;

  select * into request_row
  from public.service_requests
  where id = p_request_id
  for update;
  if not found then raise exception 'Request not found'; end if;

  if p_action = 'restart' then
    if request_row.status <> 'open' then raise exception 'Only open requests can restart dispatch'; end if;
    perform public.start_dispatch(p_request_id);
  elsif p_action = 'broadcast' then
    if request_row.status <> 'open' then raise exception 'Only open requests can broadcast'; end if;
    update public.dispatch_offers
    set status = 'superseded', responded_at = now()
    where service_request_id = p_request_id and status in ('pending', 'viewed');
    update public.service_requests
    set dispatch_phase = 'broadcast', broadcast_at = now(), updated_at = now()
    where id = p_request_id;
  elsif p_action = 'assign' then
    if p_company_id is null then raise exception 'A company is required'; end if;
    select * into company_row
    from public.companies
    where id = p_company_id
      and verification_status = 'verified';
    if not found or not exists (
      select 1 from public.company_services
      where company_id = company_row.id
        and service_category_id = request_row.service_category_id
    ) then
      raise exception 'Company is not qualified for this request';
    end if;
    if request_row.status <> 'open' then raise exception 'Request is no longer available'; end if;

    update public.service_requests
    set status = 'assigned',
        dispatch_phase = 'assigned',
        accepted_company_id = company_row.id,
        accepted_at = now(),
        updated_at = now()
    where id = p_request_id;
    update public.dispatch_offers
    set status = 'superseded', responded_at = now()
    where service_request_id = p_request_id and status in ('pending', 'viewed');
    insert into public.job_assignments (service_request_id, company_id, accepted_at)
    values (p_request_id, company_row.id, now())
    on conflict (service_request_id) do nothing;
    insert into public.notifications (recipient_id, service_request_id, title, body)
    values (
      request_row.client_id,
      p_request_id,
      'A service partner has been assigned',
      'HomeFix operations assigned a qualified service partner to your request.'
    );
  elsif p_action = 'cancel' then
    if request_row.status in ('completed', 'cancelled') then raise exception 'Request cannot be cancelled'; end if;
    update public.service_requests
    set status = 'cancelled', dispatch_phase = 'cancelled', updated_at = now()
    where id = p_request_id;
    update public.dispatch_offers
    set status = 'superseded', responded_at = now()
    where service_request_id = p_request_id and status in ('pending', 'viewed');
  else
    raise exception 'Unsupported dispatch action';
  end if;

  insert into public.request_status_history (service_request_id, status, note, created_by, metadata)
  values (
    p_request_id,
    (select status from public.service_requests where id = p_request_id),
    coalesce(p_reason, 'Operations dispatch action: ' || p_action),
    auth.uid(),
    jsonb_build_object('dispatch_action', p_action, 'assigned_company_id', p_company_id)
  );
  return jsonb_build_object('status', 'ok', 'action', p_action);
end;
$$;

revoke all on function public.admin_manage_dispatch(uuid, text, uuid, text) from public, anon;
grant execute on function public.admin_manage_dispatch(uuid, text, uuid, text) to authenticated;
