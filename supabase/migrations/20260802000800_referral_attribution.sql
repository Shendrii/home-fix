-- Referral *attribution* only — incentive fulfillment is explicitly out of
-- scope until a payments/credits primitive exists (crediting anything to an
-- account implies exactly that). This just records who invited whom.

alter table public.profiles
  add column if not exists referral_code text unique
    default (upper(substr(replace((gen_random_uuid())::text, '-', ''), 1, 8)));

-- Backfill any existing rows created before the default existed.
update public.profiles set referral_code = upper(substr(replace((gen_random_uuid())::text, '-', ''), 1, 8))
where referral_code is null;

alter table public.profiles alter column referral_code set not null;

create table if not exists public.referrals (
  id uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references public.profiles(id) on delete cascade,
  referred_user_id uuid not null unique references public.profiles(id) on delete cascade,
  code text not null,
  status text not null default 'signed_up',
  created_at timestamptz not null default now()
);

create index if not exists referrals_referrer_idx on public.referrals(referrer_id, created_at);

alter table public.referrals enable row level security;

drop policy if exists "referrer views own referrals" on public.referrals;
create policy "referrer views own referrals"
  on public.referrals for select to authenticated
  using (
    referrer_id = (select auth.uid())
    or exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role in ('admin', 'superadmin')
    )
  );

-- No insert policy for regular users: referrals are only ever created by
-- handle_new_user() (security definer), matching the trust model already
-- used for partner_invitations fulfillment.
revoke all on public.referrals from anon, authenticated;
grant select on public.referrals to authenticated;

-- Extend the existing signup trigger to link a referral when the new user
-- signed up with `?ref=CODE` (captured client-side into
-- raw_user_meta_data.referral_code). Every existing branch is preserved
-- unchanged; only the referral block at the end is new, and it is wrapped
-- so a referral-linking failure can never block account creation.
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
      -- Referral bookkeeping must never block account creation.
      null;
  end;

  return new;
end;
$function$;
