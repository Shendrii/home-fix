-- Decline reason capture. Extends dispatch_offers rather than forking a new
-- table so leaderboard/response-time math keeps reading from one place.
-- Response time is measured from `created_at` (offer issued), not `viewed_at`,
-- so the metric means "how long from being offered the job to responding" —
-- fixed now so it isn't silently redefined once data has accumulated.

alter table public.dispatch_offers
  add column if not exists decline_reason text
    check (decline_reason is null or decline_reason in ('too_far', 'wrong_category', 'unavailable', 'other'));

-- The old 2-arg overload must be dropped explicitly: adding a third
-- parameter with a default does not "replace" it, it creates an ambiguous
-- overload that breaks existing 2-arg calls.
drop function if exists public.respond_to_dispatch_offer(uuid, text);

create or replace function public.respond_to_dispatch_offer(
  p_offer_id uuid,
  p_action text,
  p_decline_reason text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  offer_row public.dispatch_offers;
begin
  select o.* into offer_row
  from public.dispatch_offers o
  join public.companies c on c.id = o.company_id
  where o.id = p_offer_id and c.owner_id = auth.uid()
  for update;
  if not found then return jsonb_build_object('status', 'not_eligible'); end if;

  if p_action = 'accept' then
    return public.claim_dispatch_request(offer_row.service_request_id, offer_row.id);
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

revoke all on function public.respond_to_dispatch_offer(uuid, text, text) from public, anon;
grant execute on function public.respond_to_dispatch_offer(uuid, text, text) to authenticated;
