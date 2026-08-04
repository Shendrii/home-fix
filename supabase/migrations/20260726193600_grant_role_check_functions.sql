-- These functions are used inside public-table RLS policies. Browser roles need
-- EXECUTE for policy evaluation; each function only evaluates auth.uid().
grant execute on function public.is_admin() to anon, authenticated;
grant execute on function public.is_superadmin() to anon, authenticated;
