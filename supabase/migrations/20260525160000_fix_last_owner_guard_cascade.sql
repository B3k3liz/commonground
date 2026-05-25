-- ============================================================================
-- CommonGround — fix last-owner guard for cascade deletes
-- Migration: 20260525160000_fix_last_owner_guard_cascade.sql
-- ----------------------------------------------------------------------------
-- app.guard_last_owner() (from 20260525120000) blocked cascade deletes:
-- deleting a row from `cooperatives` cascades to delete its `coop_members`
-- rows, and the BEFORE DELETE trigger refused to remove the last active
-- owner — making cooperatives impossible to delete.
--
-- A cooperative's referential cascade deletes the parent row first, so the
-- guard can safely stand down once the parent cooperative no longer exists.
-- 20260525120000_cooperative_ledger.sql has also been updated in place so a
-- fresh deploy is correct from the first migration.
-- ============================================================================

begin;

create or replace function app.guard_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  remaining integer;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;

  -- Tenant teardown: if the parent cooperative is already gone, there is no
  -- "at least one owner" invariant left to protect — allow the cascade.
  if not exists (select 1 from public.cooperatives where id = old.coop_id) then
    return coalesce(new, old);
  end if;

  -- An UPDATE that keeps this row an active owner is always fine.
  if tg_op = 'UPDATE' and new.role = 'owner' and new.status = 'active' then
    return new;
  end if;

  select count(*) into remaining
    from public.coop_members
   where coop_id = old.coop_id
     and role    = 'owner'
     and status  = 'active'
     and id     <> old.id;

  if remaining = 0 then
    raise exception 'A cooperative must always have at least one active owner.'
      using errcode = 'check_violation';
  end if;

  return coalesce(new, old);
end;
$$;

commit;

-- ============================================================================
-- END — 20260525160000_fix_last_owner_guard_cascade.sql
-- ============================================================================
