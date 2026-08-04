-- v1 heatmap: a static grid over a fixed 30-day lookback, not an
-- open-ended exploration tool. Buckets requests into ~0.05deg cells
-- (roughly 5-6km at this latitude) and counts, per cell, how many verified
-- partners could actually reach it — reusing the same haversine formula
-- already used by start_dispatch/claim_dispatch_request for consistency.
create or replace function public.admin_service_area_heatmap(
  p_lookback_days integer default 30,
  p_cell_size_deg numeric default 0.05
)
returns table (
  cell_lat numeric,
  cell_lng numeric,
  request_count bigint,
  partner_coverage_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.is_superadmin() then
    return;
  end if;

  return query
  with demand as (
    select
      floor(r.latitude / p_cell_size_deg) * p_cell_size_deg + (p_cell_size_deg / 2) as cell_lat,
      floor(r.longitude / p_cell_size_deg) * p_cell_size_deg + (p_cell_size_deg / 2) as cell_lng,
      count(*) as request_count
    from public.service_requests r
    where r.latitude is not null
      and r.longitude is not null
      and r.created_at >= now() - (p_lookback_days || ' days')::interval
    group by 1, 2
  )
  select
    demand.cell_lat,
    demand.cell_lng,
    demand.request_count,
    (
      select count(*)
      from public.companies c
      where c.base_latitude is not null
        and c.base_longitude is not null
        and c.verification_status = 'verified'
        and 6371 * acos(
          least(1, greatest(-1,
            cos(radians(demand.cell_lat::double precision))
            * cos(radians(c.base_latitude::double precision))
            * cos(radians(c.base_longitude::double precision) - radians(demand.cell_lng::double precision))
            + sin(radians(demand.cell_lat::double precision))
            * sin(radians(c.base_latitude::double precision))
          ))
        ) <= c.service_radius_km
    ) as partner_coverage_count
  from demand
  order by demand.request_count desc;
end;
$$;

revoke all on function public.admin_service_area_heatmap(integer, numeric) from public, anon, authenticated;
grant execute on function public.admin_service_area_heatmap(integer, numeric) to authenticated;
