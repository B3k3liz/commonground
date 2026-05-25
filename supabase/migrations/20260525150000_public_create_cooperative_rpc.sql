-- ============================================================================
-- CommonGround — public RPC wrapper for cooperative bootstrap
-- Migration: 20260525150000_public_create_cooperative_rpc.sql
-- ----------------------------------------------------------------------------
-- PostgREST (the Supabase REST/RPC layer) only exposes functions in the
-- `public` schema to the browser client. app.create_cooperative() lives in the
-- internal `app` schema, so this adds a thin public wrapper the client can
-- reach via supabase.rpc('create_cooperative', { ... }).
-- ============================================================================

begin;

create or replace function public.create_cooperative(
  p_domain         text,
  p_name           text,
  p_display_name   text,
  p_region_state   text default null,
  p_region_country text default 'US'
)
returns uuid
language sql
security definer
set search_path = ''
as $$
  select app.create_cooperative(p_domain, p_name, p_display_name, p_region_state, p_region_country);
$$;

comment on function public.create_cooperative is 'Client-callable wrapper for app.create_cooperative(). Creates a cooperative and makes the caller its first owner.';

revoke execute on function public.create_cooperative(text, text, text, text, text) from anon, public;
grant  execute on function public.create_cooperative(text, text, text, text, text) to authenticated;

commit;

-- ============================================================================
-- END — 20260525150000_public_create_cooperative_rpc.sql
-- ============================================================================
