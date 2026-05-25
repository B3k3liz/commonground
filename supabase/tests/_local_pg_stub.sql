-- ============================================================================
-- CommonGround — LOCAL Postgres stub  (verification harness only)
-- supabase/tests/_local_pg_stub.sql
-- ----------------------------------------------------------------------------
-- Do NOT run this on Supabase. Supabase already ships the `auth` schema, the
-- auth.uid() / auth.jwt() helpers, and the anon / authenticated /
-- service_role / supabase_auth_admin roles.
--
-- This file recreates just enough of that surface to exercise the migration
-- and rls_cooperative_ledger.sql on a plain local Postgres 15+ instance:
--     psql -f supabase/tests/_local_pg_stub.sql
--     psql -f supabase/migrations/20260525120000_cooperative_ledger.sql
--     psql -f supabase/tests/rls_cooperative_ledger.sql
-- ============================================================================

-- Supabase roles -------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then
    create role anon nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then
    create role authenticated nologin noinherit;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then
    create role service_role nologin noinherit bypassrls;
  end if;
  if not exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    create role supabase_auth_admin nologin noinherit;
  end if;
end$$;

-- auth schema + a minimal users table ---------------------------------------
create schema if not exists auth;

create table if not exists auth.users (
  id         uuid primary key default gen_random_uuid(),
  email      text unique,
  created_at timestamptz not null default now()
);

-- auth.uid() / auth.jwt(): read request.jwt.claims, as Supabase's own do.
create or replace function auth.uid()
returns uuid language sql stable as $$
  select nullif(
           coalesce(
             nullif(current_setting('request.jwt.claim.sub', true), ''),
             nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'
           ), ''
         )::uuid;
$$;

create or replace function auth.jwt()
returns jsonb language sql stable as $$
  select coalesce(
           nullif(current_setting('request.jwt.claims', true), ''),
           '{}'
         )::jsonb;
$$;

grant usage on schema auth to anon, authenticated, service_role, supabase_auth_admin;

-- ============================================================================
-- END — _local_pg_stub.sql
-- ============================================================================
