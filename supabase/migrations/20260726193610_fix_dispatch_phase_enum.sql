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
        100 + least(c.average_rating, 5) * 5
        - (
          select count(*) from public.service_requests active_request
          where active_request.accepted_company_id = c.id
            and active_request.status in ('assigned', 'scheduled', 'en_route', 'in_progress')
        ) * 12
        - coalesce(
          6371 * acos(least(1, greatest(-1,
            cos(radians(request_row.latitude::double precision))
            * cos(radians(c.base_latitude::double precision))
            * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
            + sin(radians(request_row.latitude::double precision))
            * sin(radians(c.base_latitude::double precision))
          ))),
          10
        )
      )::numeric as score,
      coalesce(
        6371 * acos(least(1, greatest(-1,
          cos(radians(request_row.latitude::double precision))
          * cos(radians(c.base_latitude::double precision))
          * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
          + sin(radians(request_row.latitude::double precision))
          * sin(radians(c.base_latitude::double precision))
        ))),
        null
      ) as distance_km
    from public.companies c
    join public.company_services cs on cs.company_id = c.id
    where c.verification_status = 'verified'
      and c.is_available
      and cs.service_category_id = request_row.service_category_id
      and (
        select count(*) from public.service_requests active_request
        where active_request.accepted_company_id = c.id
          and active_request.status in ('assigned', 'scheduled', 'en_route', 'in_progress')
      ) < c.max_concurrent_jobs
      and (
        request_row.latitude is null
        or c.base_latitude is null
        or c.base_longitude is null
        or (
          6371 * acos(least(1, greatest(-1,
            cos(radians(request_row.latitude::double precision))
            * cos(radians(c.base_latitude::double precision))
            * cos(radians(c.base_longitude::double precision) - radians(request_row.longitude::double precision))
            + sin(radians(request_row.latitude::double precision))
            * sin(radians(c.base_latitude::double precision))
          )))
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
