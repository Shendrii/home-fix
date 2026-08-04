-- Shared photo infrastructure for both "photo attachments on requests" and
-- "before/after completion photos": one table, one storage bucket, one pair
-- of access-check functions reused by both the table RLS and storage RLS.
-- Extends the existing `request_attachments` table rather than forking a
-- new `job_media` table, since the shape was already exactly right.

alter table public.request_attachments
  add column if not exists kind text not null default 'request'
    check (kind in ('request', 'before', 'after', 'general'));

create or replace function public.can_view_job_media(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.service_requests r
    where r.id = p_request_id
      and (
        r.client_id = (select auth.uid())
        or exists (
          select 1 from public.companies c
          where c.id = r.accepted_company_id and c.owner_id = (select auth.uid())
        )
      )
  )
  or exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
  );
$$;

create or replace function public.can_upload_job_media(p_request_id uuid, p_kind text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    case
      when p_kind = 'request' then exists (
        select 1 from public.service_requests r
        where r.id = p_request_id and r.client_id = (select auth.uid())
      )
      when p_kind in ('before', 'after', 'general') then exists (
        select 1 from public.service_requests r
        join public.companies c on c.id = r.accepted_company_id
        where r.id = p_request_id and c.owner_id = (select auth.uid())
      )
      else false
    end
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
    );
$$;

revoke all on function public.can_view_job_media(uuid) from public, anon;
revoke all on function public.can_upload_job_media(uuid, text) from public, anon;
grant execute on function public.can_view_job_media(uuid) to authenticated;
grant execute on function public.can_upload_job_media(uuid, text) to authenticated;

drop policy if exists "clients add their request attachments" on public.request_attachments;
drop policy if exists "related users view request attachments" on public.request_attachments;

create policy "job media viewable by request participants"
  on public.request_attachments for select to authenticated
  using (public.can_view_job_media(service_request_id));

create policy "job media insertable by request participants"
  on public.request_attachments for insert to authenticated
  with check (
    created_by = (select auth.uid())
    and public.can_upload_job_media(service_request_id, kind)
  );

create policy "uploader or operations can delete job media"
  on public.request_attachments for delete to authenticated
  using (
    created_by = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
    )
  );

-- Storage bucket for the actual files. Objects are stored at
-- `{service_request_id}/{kind}/{filename}` so RLS can key off the path.
insert into storage.buckets (id, name, public)
values ('job-media', 'job-media', false)
on conflict (id) do nothing;

drop policy if exists "job media storage select" on storage.objects;
create policy "job media storage select"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'job-media'
    and public.can_view_job_media(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "job media storage insert" on storage.objects;
create policy "job media storage insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'job-media'
    and public.can_upload_job_media(
      ((storage.foldername(name))[1])::uuid,
      (storage.foldername(name))[2]
    )
  );

drop policy if exists "job media storage delete" on storage.objects;
create policy "job media storage delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'job-media'
    and (
      owner = (select auth.uid())
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
      )
    )
  );
