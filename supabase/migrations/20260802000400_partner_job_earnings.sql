-- Per-completed-job rows for the calling partner, used to build the
-- estimated-activity dashboard. Deliberately named/labelled around
-- "estimated activity," not "earnings" — there is no settlement step yet,
-- so this must never be presented as a payout.
create or replace function public.partner_job_earnings()
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
  where company.owner_id = auth.uid()
    and request.status = 'completed';
$$;

revoke all on function public.partner_job_earnings() from public, anon;
grant execute on function public.partner_job_earnings() to authenticated;
