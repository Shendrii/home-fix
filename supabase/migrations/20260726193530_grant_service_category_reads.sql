-- RLS already restricts this table to active services (or operations users).
-- Explicit Data API grants let browser roles evaluate that policy.
grant select on table public.service_categories to anon, authenticated;
