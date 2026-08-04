-- Live partner tracking. Ephemeral by design: one row per company,
-- upserted — not an append-only GPS trail. Readable by a homeowner only
-- for their own currently en_route job; the moment status moves off
-- en_route (or the job is reassigned), the read policy stops matching and
-- the location becomes invisible to that client, even though the row
-- itself isn't deleted. Retention of a full location history is a
-- deliberate later decision, not a default.

create table if not exists public.partner_locations (
  company_id uuid primary key references public.companies(id) on delete cascade,
  lat numeric not null,
  lng numeric not null,
  updated_at timestamptz not null default now()
);

alter table public.partner_locations enable row level security;

drop policy if exists "partner location visible to owner, admin, or active client" on public.partner_locations;
create policy "partner location visible to owner, admin, or active client"
  on public.partner_locations for select to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = partner_locations.company_id and c.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
    )
    or exists (
      select 1 from public.service_requests r
      where r.accepted_company_id = partner_locations.company_id
        and r.client_id = (select auth.uid())
        and r.status = 'en_route'
    )
  );

drop policy if exists "partner writes own location" on public.partner_locations;
create policy "partner writes own location"
  on public.partner_locations for insert to authenticated
  with check (
    exists (
      select 1 from public.companies c
      where c.id = partner_locations.company_id and c.owner_id = (select auth.uid())
    )
  );

drop policy if exists "partner updates own location" on public.partner_locations;
create policy "partner updates own location"
  on public.partner_locations for update to authenticated
  using (
    exists (
      select 1 from public.companies c
      where c.id = partner_locations.company_id and c.owner_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.companies c
      where c.id = partner_locations.company_id and c.owner_id = (select auth.uid())
    )
  );

revoke all on public.partner_locations from anon;
grant select, insert, update on public.partner_locations to authenticated;

alter publication supabase_realtime add table public.partner_locations;
