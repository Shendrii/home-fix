-- Notify Make when a job status changes. Make updates Calendar, Gmail, and Slack.
-- The database decides that a status change happened. Make does not query Supabase.

create or replace function public.notify_make_job_status()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  client_name text;
  client_email text;
  company_name text;
begin
  if new.status is not distinct from old.status then
    return new;
  end if;

  select full_name, email
  into client_name, client_email
  from public.profiles
  where id = new.client_id;

  select name
  into company_name
  from public.companies
  where id = new.accepted_company_id;

  perform net.http_post(
    url := 'https://hook.us2.make.com/bv1v7hjj7y80lsdtjnk6n1py60yqo24h',
    body := jsonb_build_object(
      'event', 'job_status_changed',
      'job_id', new.id,
      'reference_code', new.reference_code,
      'title', new.title,
      'status', new.status,
      'previous_status', old.status,
      'address', new.address,
      'preferred_start_at', new.preferred_start_at,
      'preferred_end_at', new.preferred_end_at,
      'client_name', client_name,
      'client_email', client_email,
      'company_name', company_name
    ),
    timeout_milliseconds := 2000
  );

  return new;
end;
$$;

revoke all on function public.notify_make_job_status() from public, anon, authenticated;

drop trigger if exists service_requests_make_status_webhook on public.service_requests;

create trigger service_requests_make_status_webhook
after update of status on public.service_requests
for each row
when (old.status is distinct from new.status)
execute function public.notify_make_job_status();
