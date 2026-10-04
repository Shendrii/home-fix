-- Short feedback on a completed job. The client and service already live on the request.

alter table public.reviews
  add column if not exists would_recommend boolean,
  add column if not exists went_well text,
  add column if not exists improve text;

alter table public.service_requests
  add column if not exists feedback_reminder_sent_at timestamptz;

create or replace function public.submit_service_feedback(
  p_request_id uuid,
  p_rating smallint,
  p_would_recommend boolean,
  p_went_well text default null,
  p_improve text default null,
  p_client_id uuid default null
)
returns public.reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  request_row public.service_requests;
  created public.reviews;
  acting boolean;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;
  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Choose a rating from 1 to 5';
  end if;
  if p_would_recommend is null then
    raise exception 'Say whether you would recommend HomeFix';
  end if;

  select * into request_row
  from public.service_requests
  where id = p_request_id;

  if not found or request_row.status <> 'completed' or request_row.accepted_company_id is null then
    raise exception 'This job is not ready for feedback';
  end if;

  acting := public.is_superadmin() and p_client_id is not null and p_client_id = request_row.client_id;
  if not acting and request_row.client_id <> auth.uid() then
    raise exception 'You cannot leave feedback for this job';
  end if;

  if exists (select 1 from public.reviews where service_request_id = request_row.id) then
    raise exception 'Feedback was already sent for this job';
  end if;

  insert into public.reviews (
    service_request_id,
    client_id,
    company_id,
    rating,
    would_recommend,
    went_well,
    improve
  )
  values (
    request_row.id,
    request_row.client_id,
    request_row.accepted_company_id,
    p_rating,
    p_would_recommend,
    nullif(trim(p_went_well), ''),
    nullif(trim(p_improve), '')
  )
  returning * into created;

  update public.companies
  set
    review_count = (
      select count(*) from public.reviews where company_id = request_row.accepted_company_id
    ),
    average_rating = (
      select round(avg(rating)::numeric, 2) from public.reviews where company_id = request_row.accepted_company_id
    ),
    updated_at = now()
  where id = request_row.accepted_company_id;

  return created;
end;
$$;

revoke all on function public.submit_service_feedback(uuid, smallint, boolean, text, text, uuid) from public, anon;
grant execute on function public.submit_service_feedback(uuid, smallint, boolean, text, text, uuid) to authenticated;

create or replace function public.notify_request_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status and new.status <> 'assigned' then
    if new.status = 'completed' then
      insert into public.notifications (recipient_id, service_request_id, title, body)
      values (
        new.client_id,
        new.id,
        'Your visit is complete',
        'Open the job to leave a short note. It only takes a moment.'
      );
    else
      insert into public.notifications (recipient_id, service_request_id, title, body)
      values (
        new.client_id,
        new.id,
        'Service request updated',
        'Your request is now ' || replace(new.status::text, '_', ' ') || '.'
      );
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.remind_service_feedback()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  sent integer := 0;
  request_row record;
begin
  for request_row in
    select request.id, request.client_id, request.title
    from public.service_requests request
    join lateral (
      select history.created_at
      from public.request_status_history history
      where history.service_request_id = request.id
        and history.status = 'completed'
      order by history.created_at desc
      limit 1
    ) completed on true
    where request.status = 'completed'
      and request.feedback_reminder_sent_at is null
      and completed.created_at <= now() - interval '1 day'
      and not exists (
        select 1 from public.reviews review where review.service_request_id = request.id
      )
  loop
    insert into public.notifications (recipient_id, service_request_id, title, body)
    values (
      request_row.client_id,
      request_row.id,
      'How was the visit?',
      'A short note on “' || request_row.title || '” helps the next homeowner. Open the job when you have a moment.'
    );
    update public.service_requests
    set feedback_reminder_sent_at = now()
    where id = request_row.id;
    sent := sent + 1;
  end loop;
  return sent;
end;
$$;

revoke all on function public.remind_service_feedback() from public, anon, authenticated;

do $$
begin
  perform cron.unschedule(jobid)
  from cron.job
  where jobname = 'remind-service-feedback';
exception when undefined_table then null;
end $$;

select cron.schedule(
  'remind-service-feedback',
  '15 * * * *',
  'select public.remind_service_feedback()'
);
