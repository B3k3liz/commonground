-- ============================================================================
-- CommonGround — harden function search_path
-- Migration: 20260525130000_harden_function_search_path.sql
-- ----------------------------------------------------------------------------
-- Pins `search_path = ''` on the three functions the Supabase security advisor
-- flagged as function_search_path_mutable. Every identifier inside them is
-- already schema-qualified or a pg_catalog builtin, so an empty search_path is
-- safe and closes a search-path-injection vector.
--
-- This migration is kept separate so the live migration history matches the
-- repo. 20260525120000_cooperative_ledger.sql has also been updated in place,
-- so a fresh deploy is correct from the first migration and this one is a
-- harmless idempotent no-op.
-- ============================================================================

begin;

create or replace function app.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function app.stamp_ledger_transaction()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.recorded_by is null then
    new.recorded_by := app.current_member_id();
  end if;
  return new;
end;
$$;

create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb language plpgsql stable set search_path = '' as $$
declare
  v_coop   uuid;
  v_claims jsonb;
begin
  select coop_id into v_coop
    from public.coop_members
   where user_id = (event ->> 'user_id')::uuid
     and status  = 'active'
   order by created_at
   limit 1;

  v_claims := coalesce(event -> 'claims', '{}'::jsonb);

  if v_coop is not null then
    if v_claims ? 'app_metadata' then
      v_claims := jsonb_set(v_claims, '{app_metadata,coop_id}', to_jsonb(v_coop::text), true);
    else
      v_claims := jsonb_set(v_claims, '{app_metadata}',
                            jsonb_build_object('coop_id', v_coop::text), true);
    end if;
  end if;

  return jsonb_set(event, '{claims}', v_claims);
end;
$$;

commit;

-- ============================================================================
-- END — 20260525130000_harden_function_search_path.sql
-- ============================================================================
