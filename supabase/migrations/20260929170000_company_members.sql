-- Company membership. owner_id stays the founding owner. Access uses
-- company_members: admin manages the company, staff work the same queue.

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references public.profiles(id) on delete cascade,
  role text not null check (role in ('admin', 'staff')),
  created_at timestamptz not null default now()
);

create index if not exists company_members_company_idx
  on public.company_members(company_id);

alter table public.company_members enable row level security;

create or replace function public.is_company_member(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_company_id is not null and exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = (select auth.uid())
  );
$$;

create or replace function public.is_company_admin(p_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_company_id is not null and exists (
    select 1
    from public.company_members
    where company_id = p_company_id
      and user_id = (select auth.uid())
      and role = 'admin'
  );
$$;

revoke all on function public.is_company_member(uuid) from public, anon;
revoke all on function public.is_company_admin(uuid) from public, anon;
grant execute on function public.is_company_member(uuid) to authenticated;
grant execute on function public.is_company_admin(uuid) to authenticated;

insert into public.company_members (company_id, user_id, role)
select company.id, company.owner_id, 'admin'
from public.companies company
where company.owner_id is not null
on conflict (user_id) do nothing;

create or replace function public.add_owner_company_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.company_members (company_id, user_id, role)
  values (new.id, new.owner_id, 'admin')
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists companies_add_owner_membership on public.companies;
create trigger companies_add_owner_membership
  after insert on public.companies
  for each row
  execute function public.add_owner_company_membership();

drop policy if exists "members and operations view company members" on public.company_members;
create policy "members and operations view company members"
  on public.company_members for select to authenticated
  using (
    public.is_company_member(company_id)
    or public.is_admin()
    or public.is_superadmin()
  );

revoke all on public.company_members from anon;
grant select on public.company_members to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'company_members'
  ) then
    alter publication supabase_realtime add table public.company_members;
  end if;
end $$;

-- Request visibility, offers, notes, locations, and company profile.
drop policy if exists "clients and eligible partners view requests" on public.service_requests;
create policy "clients and eligible partners view requests"
  on public.service_requests for select to authenticated
  using (
    client_id = (select auth.uid())
    or public.is_company_member(accepted_company_id)
    or (
      status = 'open'
      and dispatch_phase = 'broadcast'
      and exists (
        select 1
        from public.companies c
        join public.company_services cs on cs.company_id = c.id
        join public.company_members member on member.company_id = c.id
        where member.user_id = (select auth.uid())
          and c.verification_status = 'verified'
          and cs.service_category_id = service_requests.service_category_id
      )
    )
    or exists (
      select 1
      from public.dispatch_offers offer
      where offer.service_request_id = service_requests.id
        and public.is_company_member(offer.company_id)
    )
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
  );

drop policy if exists "partners view own dispatch offers" on public.dispatch_offers;
create policy "partners view own dispatch offers"
  on public.dispatch_offers for select to authenticated
  using (public.is_company_member(company_id));

drop policy if exists "related users view assignments" on public.job_assignments;
create policy "related users view assignments"
  on public.job_assignments for select to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.service_requests request
      where request.id = job_assignments.service_request_id
        and request.client_id = (select auth.uid())
    )
    or public.is_company_member(company_id)
  );

drop policy if exists "related users view request history" on public.request_status_history;
create policy "related users view request history"
  on public.request_status_history for select to authenticated
  using (
    public.is_admin()
    or public.is_superadmin()
    or exists (
      select 1
      from public.service_requests request
      where request.id = request_status_history.service_request_id
        and (
          request.client_id = (select auth.uid())
          or public.is_company_member(request.accepted_company_id)
        )
    )
  );

drop policy if exists "assigned partner manages job notes" on public.job_notes;
create policy "assigned partner manages job notes"
  on public.job_notes for all to authenticated
  using (
    exists (
      select 1
      from public.service_requests request
      where request.id = job_notes.service_request_id
        and public.is_company_member(request.accepted_company_id)
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
        where request.id = job_notes.service_request_id
          and public.is_company_member(request.accepted_company_id)
      )
      or exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid())
          and p.role in ('admin', 'superadmin')
      )
    )
  );

drop policy if exists "owners manage partner company details" on public.companies;
create policy "owners manage partner company details"
  on public.companies for update to authenticated
  using (public.is_company_admin(id) or public.is_superadmin())
  with check (public.is_company_admin(id) or public.is_superadmin());

drop policy if exists "partner location visible to owner, admin, or active client" on public.partner_locations;
create policy "partner location visible to owner, admin, or active client"
  on public.partner_locations for select to authenticated
  using (
    public.is_company_member(company_id)
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid())
        and p.role in ('admin', 'superadmin')
    )
    or exists (
      select 1 from public.service_requests request
      where request.accepted_company_id = partner_locations.company_id
        and request.client_id = (select auth.uid())
        and request.status = 'en_route'
    )
  );

drop policy if exists "partner writes own location" on public.partner_locations;
create policy "partner writes own location"
  on public.partner_locations for insert to authenticated
  with check (public.is_company_member(company_id));

drop policy if exists "partner updates own location" on public.partner_locations;
create policy "partner updates own location"
  on public.partner_locations for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create or replace function public.can_view_job_media(p_request_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.service_requests request
    where request.id = p_request_id
      and (
        request.client_id = (select auth.uid())
        or public.is_company_member(request.accepted_company_id)
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
        select 1 from public.service_requests request
        where request.id = p_request_id and request.client_id = (select auth.uid())
      )
      when p_kind in ('before', 'after', 'general') then exists (
        select 1 from public.service_requests request
        where request.id = p_request_id
          and public.is_company_member(request.accepted_company_id)
      )
      else false
    end
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
    );
$$;

create or replace function public.set_company_availability(
  p_available boolean,
  p_company_id uuid default null
)
returns public.companies
language plpgsql
security definer
set search_path = public
as $$
declare
  updated_company public.companies;
  member_company_id uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if public.is_superadmin() and p_company_id is not null then
    update public.companies
    set is_available = p_available,
        last_online_at = case when p_available then now() else last_online_at end,
        updated_at = now()
    where id = p_company_id
    returning * into updated_company;
  else
    select company_id into member_company_id
    from public.company_members
    where user_id = auth.uid() and role = 'admin'
    limit 1;

    if member_company_id is null then
      raise exception 'Only a company admin can change availability';
    end if;

    update public.companies
    set is_available = p_available,
        last_online_at = case when p_available then now() else last_online_at end,
        updated_at = now()
    where id = member_company_id
    returning * into updated_company;
  end if;

  if not found then raise exception 'Partner company not found'; end if;
  return updated_company;
end;
$$;

create or replace function public.claim_dispatch_request(
  p_request_id uuid,
  p_offer_id uuid default null,
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  company_row public.companies;
  request_row public.service_requests;
  accepted_request public.service_requests;
  acting boolean;
begin
  acting := public.is_superadmin() and p_company_id is not null;

  if acting then
    select * into company_row
    from public.companies
    where id = p_company_id
    for update;
  else
    select company.* into company_row
    from public.companies company
    join public.company_members member
      on member.company_id = company.id
     and member.user_id = auth.uid()
    for update of company;
  end if;

  if not found or company_row.verification_status <> 'verified' then
    return jsonb_build_object('status', 'not_eligible');
  end if;
  if not company_row.is_available then
    return jsonb_build_object('status', 'offline');
  end if;

  select * into request_row
  from public.service_requests
  where id = p_request_id
  for update;
  if not found or request_row.status <> 'open' then
    return jsonb_build_object('status', 'already_claimed');
  end if;

  if not exists (
    select 1 from public.company_services
    where company_id = company_row.id
      and service_category_id = request_row.service_category_id
  ) then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  if (
    request_row.dispatch_phase = 'exclusive_offers'
    and not exists (
      select 1 from public.dispatch_offers
      where id = p_offer_id
        and service_request_id = request_row.id
        and company_id = company_row.id
        and status in ('pending', 'viewed')
        and exclusive_until > now()
    )
  ) then
    return jsonb_build_object('status', 'offer_expired');
  end if;

  if request_row.dispatch_phase not in ('exclusive_offers', 'broadcast') then
    return jsonb_build_object('status', 'not_eligible');
  end if;

  update public.service_requests
  set status = 'assigned',
      dispatch_phase = 'assigned',
      accepted_company_id = company_row.id,
      accepted_at = now(),
      updated_at = now()
  where id = p_request_id and status = 'open'
  returning * into accepted_request;
  if not found then return jsonb_build_object('status', 'already_claimed'); end if;

  update public.dispatch_offers
  set status = case
        when id = p_offer_id then 'accepted'::public.dispatch_offer_status
        else 'superseded'::public.dispatch_offer_status
      end,
      responded_at = now()
  where service_request_id = p_request_id
    and status in ('pending', 'viewed');

  insert into public.job_assignments (service_request_id, company_id, accepted_at)
  values (accepted_request.id, company_row.id, accepted_request.accepted_at)
  on conflict (service_request_id) do nothing;

  insert into public.request_status_history (service_request_id, status, note, created_by, metadata)
  values (
    accepted_request.id,
    'assigned',
    case
      when acting then 'Accepted by superadmin while viewing as this company'
      else 'Accepted through qualified partner dispatch'
    end,
    auth.uid(),
    jsonb_build_object(
      'dispatch_phase', request_row.dispatch_phase,
      'acted_as_company_id', case when acting then company_row.id else null end
    )
  );

  insert into public.notifications (recipient_id, service_request_id, title, body)
  values (
    accepted_request.client_id,
    accepted_request.id,
    'A qualified partner accepted your request',
    'Your service professional has been assigned. We will update you when the visit is scheduled.'
  );

  return jsonb_build_object(
    'status', 'assigned',
    'request_id', accepted_request.id,
    'company_id', company_row.id
  );
end;
$$;

create or replace function public.respond_to_dispatch_offer(
  p_offer_id uuid,
  p_action text,
  p_decline_reason text default null,
  p_company_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.dispatch_offers;
  acting boolean;
begin
  acting := public.is_superadmin() and p_company_id is not null;

  select offer.* into offer_row
  from public.dispatch_offers offer
  where offer.id = p_offer_id
    and (
      (acting and offer.company_id = p_company_id)
      or (not acting and public.is_company_member(offer.company_id))
    )
  for update;
  if not found then return jsonb_build_object('status', 'not_eligible'); end if;

  if p_action = 'accept' then
    return public.claim_dispatch_request(offer_row.service_request_id, offer_row.id, case when acting then p_company_id else null end);
  end if;

  if p_action <> 'decline' then
    return jsonb_build_object('status', 'invalid_action');
  end if;

  if p_decline_reason is not null and p_decline_reason not in ('too_far', 'wrong_category', 'unavailable', 'other') then
    p_decline_reason := 'other';
  end if;

  update public.dispatch_offers
  set status = 'declined', responded_at = now(), decline_reason = p_decline_reason
  where id = offer_row.id
    and status in ('pending', 'viewed');
  if not found then return jsonb_build_object('status', 'offer_expired'); end if;
  return jsonb_build_object('status', 'declined');
end;
$$;

create or replace function public.partner_job_earnings(p_company_id uuid default null)
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
  where request.status = 'completed'
    and company.id = coalesce(
      case when public.is_superadmin() then p_company_id else null end,
      (select member.company_id from public.company_members member where member.user_id = auth.uid() limit 1)
    );
$$;

create or replace function public.update_service_request_status(
  p_request_id uuid,
  p_status public.request_status,
  p_note text default null,
  p_company_id uuid default null,
  p_client_id uuid default null
)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  current_request public.service_requests;
  updated_request public.service_requests;
  is_assigned_partner boolean;
  partner_transition boolean;
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

  partner_transition :=
    (current_request.status = 'assigned' and p_status in ('scheduled', 'en_route', 'cancelled'))
    or (current_request.status = 'scheduled' and p_status in ('en_route', 'cancelled'))
    or (current_request.status = 'en_route' and p_status in ('in_progress', 'cancelled'))
    or (current_request.status = 'in_progress' and p_status in ('completed', 'cancelled'));

  if public.is_admin() then
    null;
  elsif public.is_superadmin()
    and p_client_id is not null
    and p_client_id = current_request.client_id
    and current_request.status = 'open'
    and p_status = 'cancelled' then
    null;
  elsif public.is_superadmin()
    and p_company_id is not null
    and p_company_id = current_request.accepted_company_id then
    if not partner_transition then
      raise exception 'Invalid request status transition';
    end if;
  elsif current_request.client_id = auth.uid()
    and current_request.status = 'open'
    and p_status = 'cancelled' then
    null;
  else
    is_assigned_partner := public.is_company_member(current_request.accepted_company_id);

    if not is_assigned_partner then
      raise exception 'You cannot update this request';
    end if;

    if not partner_transition then
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
$$;

create or replace function public.accept_service_request(p_request_id uuid, p_company_id uuid)
returns public.service_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  claimed jsonb;
  accepted_request public.service_requests;
begin
  if not public.is_company_member(p_company_id) then
    raise exception 'You cannot accept requests for this company';
  end if;
  claimed := public.claim_dispatch_request(p_request_id, null);
  if claimed ->> 'status' <> 'assigned' then
    raise exception '%', claimed ->> 'status';
  end if;
  select * into accepted_request from public.service_requests where id = p_request_id;
  return accepted_request;
end;
$$;

create or replace function public.mark_dispatch_offer_viewed(p_offer_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.dispatch_offers
  set status = 'viewed', viewed_at = coalesce(viewed_at, now())
  where id = p_offer_id
    and status = 'pending'
    and public.is_company_member(company_id);
$$;

-- Member invites reuse partner_invitations. target_company_id means "join this
-- company" instead of creating a second company on accept.
alter table public.partner_invitations
  add column if not exists target_company_id uuid references public.companies(id) on delete cascade,
  add column if not exists member_role text check (member_role in ('admin', 'staff'));

create or replace function public.fulfill_partner_invitation(p_invitation_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  inv public.partner_invitations;
  uid uuid;
  existing_company_id uuid;
  created_company_id uuid;
  profile_role public.user_role;
begin
  select * into inv
  from public.partner_invitations
  where id = p_invitation_id
  for update;

  if not found then
    raise exception 'Invitation not found';
  end if;

  if inv.accepted_at is not null or inv.revoked_at is not null or inv.expires_at <= now() then
    raise exception 'Invitation is no longer active';
  end if;

  select u.id into uid
  from auth.users u
  where lower(u.email) = lower(inv.email)
  limit 1;

  if uid is null then
    return jsonb_build_object('status', 'pending_signup');
  end if;

  select member.company_id into existing_company_id
  from public.company_members member
  where member.user_id = uid
  limit 1;

  if existing_company_id is not null then
    update public.partner_invitations
    set
      accepted_at = coalesce(accepted_at, now()),
      auth_user_id = uid,
      company_id = existing_company_id
    where id = inv.id;

    return jsonb_build_object(
      'status', 'already_provisioned',
      'company_id', existing_company_id,
      'user_id', uid
    );
  end if;

  select role into profile_role from public.profiles where id = uid;
  if profile_role in ('admin', 'superadmin') then
    raise exception 'Platform staff cannot join a partner company';
  end if;

  if not exists (select 1 from public.profiles where id = uid) then
    insert into public.profiles (id, email, full_name, phone, default_address, role)
    values (
      uid,
      lower(inv.email),
      split_part(inv.email, '@', 1),
      coalesce(nullif(trim(inv.phone), ''), 'Pending update'),
      'Pending update',
      'partner'
    );
  else
    update public.profiles
    set
      role = 'partner'::public.user_role,
      email = coalesce(nullif(trim(email), ''), lower(inv.email)),
      phone = coalesce(nullif(trim(phone), ''), nullif(trim(inv.phone), ''), phone),
      updated_at = now()
    where id = uid;
  end if;

  if inv.target_company_id is not null then
    if inv.member_role not in ('admin', 'staff') then
      raise exception 'Invitation is missing a company role';
    end if;

    insert into public.company_members (company_id, user_id, role)
    values (inv.target_company_id, uid, inv.member_role);

    update public.partner_invitations
    set
      accepted_at = now(),
      auth_user_id = uid,
      company_id = inv.target_company_id
    where id = inv.id;

    return jsonb_build_object(
      'status', 'provisioned',
      'company_id', inv.target_company_id,
      'user_id', uid
    );
  end if;

  insert into public.companies (
    owner_id,
    name,
    description,
    phone,
    email,
    service_area,
    operating_hours,
    verification_status,
    is_available
  )
  values (
    uid,
    inv.company_name,
    inv.company_description,
    inv.phone,
    lower(inv.email),
    inv.service_area,
    inv.operating_hours,
    'verified',
    false
  )
  returning id into created_company_id;

  insert into public.company_services (company_id, service_category_id)
  select created_company_id, unnest(inv.service_category_ids);

  update public.partner_invitations
  set
    accepted_at = now(),
    auth_user_id = uid,
    company_id = created_company_id
  where id = inv.id;

  return jsonb_build_object(
    'status', 'provisioned',
    'company_id', created_company_id,
    'user_id', uid
  );
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  invitation public.partner_invitations;
  assigned_role public.user_role := 'client';
  created_company_id uuid;
  meta_full_name text;
  meta_phone text;
  meta_default_address text;
  v_referral_code text;
  v_referrer_id uuid;
begin
  meta_full_name := nullif(trim(coalesce(new.raw_user_meta_data ->> 'full_name', '')), '');
  meta_phone := nullif(trim(coalesce(new.raw_user_meta_data ->> 'phone', '')), '');
  meta_default_address := nullif(trim(coalesce(new.raw_user_meta_data ->> 'default_address', '')), '');

  select * into invitation
  from public.partner_invitations
  where email = lower(new.email)
    and accepted_at is null
    and revoked_at is null
    and expires_at > now()
  order by invited_at desc
  limit 1
  for update;

  if exists (select 1 from public.superadmin_bootstrap_emails where email = lower(new.email)) then
    assigned_role := 'superadmin';
  elsif found then
    assigned_role := 'partner';
  end if;

  insert into public.profiles (id, email, full_name, phone, default_address, role)
  values (
    new.id,
    lower(new.email),
    coalesce(
      meta_full_name,
      split_part(new.email, '@', 1),
      'HomeFix user'
    ),
    coalesce(meta_phone, invitation.phone, 'Pending update'),
    coalesce(meta_default_address, 'Pending update'),
    assigned_role
  );

  if assigned_role = 'partner' and invitation.target_company_id is not null then
    if invitation.member_role in ('admin', 'staff')
      and not exists (select 1 from public.company_members where user_id = new.id) then
      insert into public.company_members (company_id, user_id, role)
      values (invitation.target_company_id, new.id, invitation.member_role);
    end if;

    update public.partner_invitations
    set accepted_at = now(), auth_user_id = new.id, company_id = invitation.target_company_id
    where id = invitation.id;
  elsif assigned_role = 'partner' then
    insert into public.companies (
      owner_id, name, description, phone, email, service_area, operating_hours, verification_status, is_available
    ) values (
      new.id, invitation.company_name, invitation.company_description, invitation.phone, invitation.email,
      invitation.service_area, invitation.operating_hours, 'verified', false
    ) returning id into created_company_id;

    insert into public.company_services (company_id, service_category_id)
    select created_company_id, unnest(invitation.service_category_ids);

    update public.partner_invitations
    set accepted_at = now(), auth_user_id = new.id, company_id = created_company_id
    where id = invitation.id;
  end if;

  begin
    v_referral_code := nullif(upper(trim(coalesce(new.raw_user_meta_data ->> 'referral_code', ''))), '');
    if v_referral_code is not null then
      select id into v_referrer_id
      from public.profiles
      where referral_code = v_referral_code and id <> new.id;

      if v_referrer_id is not null then
        insert into public.referrals (referrer_id, referred_user_id, code)
        values (v_referrer_id, new.id, v_referral_code)
        on conflict (referred_user_id) do nothing;
      end if;
    end if;
  exception
    when others then
      null;
  end;

  return new;
end;
$function$;
