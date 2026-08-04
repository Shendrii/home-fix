-- Repair partner provisioning when auth.users exists but profiles was removed manually.

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

  select c.id into existing_company_id
  from public.companies c
  where c.owner_id = uid
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
      role = case when role in ('admin', 'superadmin') then role else 'partner'::public.user_role end,
      email = coalesce(nullif(trim(email), ''), lower(inv.email)),
      phone = coalesce(nullif(trim(phone), ''), nullif(trim(inv.phone), ''), phone),
      updated_at = now()
    where id = uid;
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

revoke all on function public.fulfill_partner_invitation(uuid) from public, anon, authenticated;
grant execute on function public.fulfill_partner_invitation(uuid) to service_role;
