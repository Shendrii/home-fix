-- Remove a partner account (company + invitations + auth user) so they can be re-invited.

create or replace function public.admin_reset_partner_account(p_email text)
returns jsonb
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  normalized_email text := lower(trim(p_email));
  uid uuid;
  company_row public.companies;
begin
  if normalized_email = '' or position('@' in normalized_email) = 0 then
    raise exception 'A valid email is required';
  end if;

  select u.id into uid
  from auth.users u
  where lower(u.email) = normalized_email
  limit 1;

  if uid is null then
    delete from public.partner_invitations where lower(email) = normalized_email;
    return jsonb_build_object('status', 'not_found', 'message', 'No auth user; cleared any pending invitations.');
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and role in ('admin', 'superadmin')
  ) then
    raise exception 'Cannot reset admin or superadmin accounts';
  end if;

  select * into company_row
  from public.companies
  where owner_id = uid
  limit 1;

  if found then
    update public.service_requests
    set accepted_company_id = null
    where accepted_company_id = company_row.id;

    delete from public.job_assignments where company_id = company_row.id;
    delete from public.reviews where company_id = company_row.id;
    delete from public.companies where id = company_row.id;
  end if;

  delete from public.partner_invitations
  where lower(email) = normalized_email or auth_user_id = uid;

  delete from auth.users where id = uid;

  return jsonb_build_object('status', 'removed', 'email', normalized_email);
end;
$$;

revoke all on function public.admin_reset_partner_account(text) from public, anon, authenticated;
grant execute on function public.admin_reset_partner_account(text) to service_role;
