-- Partners should see broadcast jobs when verified and qualified, even off duty.
-- Claiming still requires is_available via claim_dispatch_request.

drop policy if exists "clients and eligible partners view requests" on public.service_requests;

create policy "clients and eligible partners view requests"
  on public.service_requests for select to authenticated
  using (
    client_id = (select auth.uid())
    or exists (
      select 1 from public.companies c
      where c.id = service_requests.accepted_company_id
        and c.owner_id = (select auth.uid())
    )
    or (
      service_requests.status = 'open'
      and service_requests.dispatch_phase = 'broadcast'
      and exists (
        select 1
        from public.companies c
        join public.company_services cs on cs.company_id = c.id
        where c.owner_id = (select auth.uid())
          and c.verification_status = 'verified'
          and cs.service_category_id = service_requests.service_category_id
      )
    )
    or exists (
      select 1
      from public.dispatch_offers o
      join public.companies c on c.id = o.company_id
      where o.service_request_id = service_requests.id
        and c.owner_id = (select auth.uid())
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
  );
