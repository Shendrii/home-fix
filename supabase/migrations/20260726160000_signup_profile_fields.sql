-- Signup profile fields: NOT NULL phone + default_address, handle_new_user reads metadata.

update public.profiles
set phone = coalesce(nullif(trim(phone), ''), 'Pending update')
where phone is null or trim(phone) = '';

update public.profiles
set default_address = coalesce(nullif(trim(default_address), ''), 'Pending update')
where default_address is null or trim(default_address) = '';

alter table public.profiles
  alter column phone set default '',
  alter column phone set not null,
  alter column default_address set default '',
  alter column default_address set not null;

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

  insert into public.profiles (id, full_name, phone, default_address, role)
  values (
    new.id,
    coalesce(
      meta_full_name,
      split_part(new.email, '@', 1),
      'HomeFix user'
    ),
    coalesce(meta_phone, invitation.phone, 'Pending update'),
    coalesce(meta_default_address, 'Pending update'),
    assigned_role
  );

  if assigned_role = 'partner' then
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

  return new;
end;
$function$;
