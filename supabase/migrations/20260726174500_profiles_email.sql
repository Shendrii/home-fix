-- Store contact email on profiles for CRM/offers; source of truth remains auth.users.

alter table public.profiles
  add column if not exists email text;

update public.profiles p
set email = lower(u.email)
from auth.users u
where u.id = p.id
  and u.email is not null
  and (p.email is null or trim(p.email) = '');

create index if not exists profiles_email_lower_idx on public.profiles (lower(email));

create or replace function public.sync_profile_email_from_auth()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  update public.profiles
  set
    email = lower(new.email),
    updated_at = now()
  where id = new.id;
  return new;
end;
$function$;

drop trigger if exists on_auth_user_email_updated on auth.users;
create trigger on_auth_user_email_updated
  after update of email on auth.users
  for each row
  when (old.email is distinct from new.email)
  execute function public.sync_profile_email_from_auth();

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
