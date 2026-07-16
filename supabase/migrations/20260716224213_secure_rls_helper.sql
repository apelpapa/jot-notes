-- Applied to Supabase as migration version 20260716224213.
-- This event-trigger function is invoked by PostgreSQL itself. Application
-- roles must not be able to execute the SECURITY DEFINER helper directly.
revoke execute on function public.rls_auto_enable() from public, anon, authenticated;
