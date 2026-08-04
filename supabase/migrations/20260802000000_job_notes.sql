-- In-app job notes/checklist per job. Deliberately separate from
-- request_status_history, which is a trigger/admin-driven audit trail —
-- mixing free-text partner notes into it would make that trail noisy.

create table if not exists public.job_notes (
  id uuid primary key default gen_random_uuid(),
  service_request_id uuid not null references public.service_requests(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists job_notes_request_idx
  on public.job_notes(service_request_id, created_at);

alter table public.job_notes enable row level security;

drop policy if exists "assigned partner manages job notes" on public.job_notes;
create policy "assigned partner manages job notes"
  on public.job_notes for all to authenticated
  using (
    exists (
      select 1
      from public.service_requests request
      join public.companies company on company.id = request.accepted_company_id
      where request.id = job_notes.service_request_id
        and company.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
  )
  with check (
    author_id = (select auth.uid())
    and (
      exists (
        select 1
        from public.service_requests request
        join public.companies company on company.id = request.accepted_company_id
        where request.id = job_notes.service_request_id
          and company.owner_id = (select auth.uid())
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.role in ('admin', 'superadmin')
      )
    )
  );

revoke all on public.job_notes from anon;
grant select, insert, delete on public.job_notes to authenticated;
