-- `estimated_price_cents` is a pre-work display estimate, not a settled
-- amount. Adding `final_price_cents` now (defaulted to the estimate at
-- completion) gives the future earnings dashboard a stable column to read
-- from forever, instead of silently treating the estimate as a payout.

alter table public.service_requests
  add column if not exists final_price_cents integer;

create or replace function public.update_service_request_status(p_request_id uuid, p_status request_status, p_note text default null::text)
 returns service_requests
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
declare
  current_request public.service_requests;
  updated_request public.service_requests;
  is_assigned_partner boolean;
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

  if public.is_admin() then
    null;
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

    if not (
      (current_request.status = 'assigned' and p_status in ('scheduled', 'en_route', 'cancelled'))
      or (current_request.status = 'scheduled' and p_status in ('en_route', 'cancelled'))
      or (current_request.status = 'en_route' and p_status in ('in_progress', 'cancelled'))
      or (current_request.status = 'in_progress' and p_status in ('completed', 'cancelled'))
    ) then
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
$function$;

-- Partner performance leaderboard, exposed as a security-definer function
-- (not a stored/cached table) so it stays a live read rather than a second
-- source of truth to keep in sync. Superadmin-only, matching the existing
-- admin_partner_activity pattern.
create or replace function public.admin_partner_leaderboard()
returns table (
  company_id uuid,
  company_name text,
  verification_status company_verification_status,
  is_available boolean,
  offers_received bigint,
  offers_accepted bigint,
  offers_declined bigint,
  offers_expired bigint,
  completed_jobs bigint,
  cancelled_after_assignment bigint,
  completion_rate numeric,
  avg_response_seconds numeric,
  average_rating numeric,
  review_count integer
)
language sql
stable
security definer
set search_path = public
as $$
  -- Aggregated as two independent per-company CTEs, then joined once each
  -- side is already one row per company. Joining dispatch_offers and
  -- service_requests directly in one FROM would fan out (every offer row
  -- crossed with every request row for that company), silently inflating
  -- every count.
  with offer_stats as (
    select
      company_id,
      count(*) as offers_received,
      count(*) filter (where status = 'accepted') as offers_accepted,
      count(*) filter (where status = 'declined') as offers_declined,
      count(*) filter (where status = 'expired') as offers_expired,
      round(
        avg(extract(epoch from (responded_at - created_at))) filter (where responded_at is not null),
        1
      ) as avg_response_seconds
    from public.dispatch_offers
    group by company_id
  ),
  job_stats as (
    select
      accepted_company_id as company_id,
      count(*) filter (where status = 'completed') as completed_jobs,
      count(*) filter (where status = 'cancelled') as cancelled_after_assignment,
      round(
        count(*) filter (where status = 'completed')::numeric
        / nullif(count(*) filter (where status in ('completed', 'cancelled')), 0),
        2
      ) as completion_rate
    from public.service_requests
    where accepted_company_id is not null
    group by accepted_company_id
  )
  select
    company.id,
    company.name,
    company.verification_status,
    company.is_available,
    coalesce(offer_stats.offers_received, 0),
    coalesce(offer_stats.offers_accepted, 0),
    coalesce(offer_stats.offers_declined, 0),
    coalesce(offer_stats.offers_expired, 0),
    coalesce(job_stats.completed_jobs, 0),
    coalesce(job_stats.cancelled_after_assignment, 0),
    job_stats.completion_rate,
    offer_stats.avg_response_seconds,
    company.average_rating,
    company.review_count
  from public.companies company
  left join offer_stats on offer_stats.company_id = company.id
  left join job_stats on job_stats.company_id = company.id
  where public.is_superadmin();
$$;

revoke all on function public.admin_partner_leaderboard() from public, anon, authenticated;
grant execute on function public.admin_partner_leaderboard() to authenticated;
