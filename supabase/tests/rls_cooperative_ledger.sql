-- ============================================================================
-- CommonGround — RLS verification for the cooperative ledger
-- supabase/tests/rls_cooperative_ledger.sql
-- ----------------------------------------------------------------------------
-- Proves that the policies in 20260525120000_cooperative_ledger.sql actually
-- hold: tenant isolation, role gating, append-only sync, the membership
-- fallback, and the last-owner guard.
--
-- SAFE: the whole script runs in ONE transaction and ROLLBACKs at the end.
-- It writes nothing permanent — run it against a dev or branch database.
--
-- RUN
--   Supabase (local dev or branch):
--       psql "$DATABASE_URL" -f supabase/tests/rls_cooperative_ledger.sql
--   Plain local Postgres 15+:
--       psql -f supabase/tests/_local_pg_stub.sql
--       psql -f supabase/migrations/20260525120000_cooperative_ledger.sql
--       psql -f supabase/tests/rls_cooperative_ledger.sql
--
-- A clean run prints "PASS" lines and finishes with:
--       >>> ALL RLS CHECKS PASSED <<<
-- Any failed assertion aborts the run with the failing message.
--
-- Identities exercised:
--   user A  — owner of Coop A          user B — owner of Coop B
--   user V  — viewer in Coop A         (read-only role)
-- Context UUIDs are stashed in cg.* GUCs so the cross-tenant attack tests can
-- reference a foreign tenant id (an attacker who already knows the UUID).
-- ============================================================================

\set ON_ERROR_STOP on
begin;

-- ============================================================================
-- SETUP — runs as the migration/owner role (bypasses RLS)
-- ============================================================================
insert into auth.users (id, email) values
  (gen_random_uuid(), 'bekah@coop-a.test'),
  (gen_random_uuid(), 'otto@coop-b.test'),
  (gen_random_uuid(), 'val@coop-a.test');

select set_config('cg.user_a', (select id::text from auth.users where email='bekah@coop-a.test'), true);
select set_config('cg.user_b', (select id::text from auth.users where email='otto@coop-b.test'),  true);
select set_config('cg.user_v', (select id::text from auth.users where email='val@coop-a.test'),   true);

-- ============================================================================
-- T0 — the anon role can touch nothing
-- ============================================================================
select set_config('request.jwt.claims', '', true);
set local role anon;
do $$
declare blocked boolean := false;
begin
  begin
    perform 1 from public.ledger_transactions;
  exception when others then blocked := true;
  end;
  assert blocked, 'T0: anon was able to read ledger_transactions';
  raise notice 'PASS T0   anon is denied all ledger access.';
end$$;
reset role;

-- ============================================================================
-- T1 — bootstrap RPC: a signed-in user creates a coop and becomes its owner
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_coop uuid;
begin
  v_coop := app.create_cooperative('coop-a.test', 'Oak Creek Co-op', 'Bekah', 'OR');
  assert v_coop is not null, 'T1: create_cooperative returned null';
  perform set_config('cg.coop_a', v_coop::text, true);
  raise notice 'PASS T1   bootstrap RPC created Coop A and its owner.';
end$$;
reset role;

select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_b'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare v_coop uuid;
begin
  v_coop := app.create_cooperative('coop-b.test', 'Cedar Ridge Co-op', 'Otto', 'CA');
  perform set_config('cg.coop_b', v_coop::text, true);
  raise notice 'PASS T1b  bootstrap RPC created Coop B and its owner.';
end$$;
reset role;

-- add user V as a VIEWER in Coop A (owner-role setup, bypasses RLS)
insert into public.coop_members (coop_id, user_id, display_name, role, status)
values (current_setting('cg.coop_a')::uuid, current_setting('cg.user_v')::uuid,
        'Val (viewer)', 'viewer', 'active');

-- ============================================================================
-- helper: load a full JWT (with coop_id) for a given user + coop
-- ============================================================================
-- (inlined per test below)

-- ============================================================================
-- T2 — tenant read isolation: a member sees only their own coop + members
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.cooperatives;
  assert n = 1, format('T2: user A should see exactly 1 cooperative, saw %s', n);
  select count(*) into n from public.coop_members;
  assert n = 2, format('T2: user A should see 2 members of Coop A, saw %s', n);
  raise notice 'PASS T2   tenant read isolation (cooperative + members scoped).';
end$$;
reset role;

-- ============================================================================
-- T3 — ledger writes: a member may insert into their own coop's ledger
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare v_tx uuid;
begin
  insert into public.ledger_transactions (coop_id, description, direction, source, amount_cents)
  values (current_setting('cg.coop_a')::uuid, 'Monthly CSA renewals', 'income', 'csa_subscription', 120000)
  returning id into v_tx;
  assert v_tx is not null, 'T3: member insert into own ledger failed';
  raise notice 'PASS T3a  member insert into own coop ledger.';
end$$;
reset role;

select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_b'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_b')))::text, true);
set local role authenticated;
do $$
begin
  insert into public.ledger_transactions (coop_id, description, direction, source, amount_cents)
  values (current_setting('cg.coop_b')::uuid, 'Tool library rental', 'income', 'tool_library', 18000);
  raise notice 'PASS T3b  Coop B owner insert into Coop B ledger.';
end$$;
reset role;

-- ============================================================================
-- T4 — cross-tenant WRITE is blocked (WITH CHECK)
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.ledger_transactions (coop_id, description, direction, amount_cents)
    values (current_setting('cg.coop_b')::uuid, 'cross-tenant write', 'income', 999);
  exception when others then blocked := true;
  end;
  assert blocked, 'T4: user A wrote a ledger row into Coop B';
  raise notice 'PASS T4   cross-tenant insert blocked.';
end$$;
reset role;

-- ============================================================================
-- T5 — cross-tenant READ returns nothing (USING)
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.ledger_transactions;
  assert n = 1, format('T5: user A should see only Coop A''s 1 ledger row, saw %s', n);
  select count(*) into n from public.ledger_transactions
   where coop_id = current_setting('cg.coop_b')::uuid;
  assert n = 0, 'T5: user A could read Coop B ledger rows by explicit coop_id';
  raise notice 'PASS T5   cross-tenant read returns nothing.';
end$$;
reset role;

-- ============================================================================
-- T6 — a viewer cannot write (role gate)
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_v'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin
    insert into public.ledger_transactions (coop_id, description, direction, amount_cents)
    values (current_setting('cg.coop_a')::uuid, 'viewer write attempt', 'income', 500);
  exception when others then blocked := true;
  end;
  assert blocked, 'T6: a viewer inserted a ledger row';
  raise notice 'PASS T6   viewer write blocked by role gate.';
end$$;
reset role;

-- ============================================================================
-- T7 — a viewer CAN read their coop's ledger
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_v'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.ledger_transactions;
  assert n = 1, format('T7: viewer should read Coop A''s 1 ledger row, saw %s', n);
  raise notice 'PASS T7   viewer read allowed.';
end$$;
reset role;

-- ============================================================================
-- T8 — a non-admin cannot escalate their own role (guard trigger)
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_v'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  begin
    update public.coop_members set role = 'owner'
     where user_id = current_setting('cg.user_v')::uuid;
  exception when others then blocked := true;
  end;
  assert blocked, 'T8: a viewer escalated their own role to owner';
  raise notice 'PASS T8   self role-escalation blocked by guard trigger.';
end$$;
reset role;

-- ============================================================================
-- T9 — sync_mutations: append-only, author pinned to the caller
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare blocked boolean := false;
begin
  -- 9a: append a mutation as yourself
  insert into public.sync_mutations
    (coop_id, target_table, record_id, field, value, hlc_timestamp, author_id)
  values (current_setting('cg.coop_a')::uuid, 'ledger_transactions', 'rec-1', 'description',
          to_jsonb('hello'::text), '1716638400000-0000-node-a', current_setting('cg.user_a')::uuid);
  raise notice 'PASS T9a  sync_mutations append as self.';

  -- 9b: a spoofed author_id is rejected
  blocked := false;
  begin
    insert into public.sync_mutations
      (coop_id, target_table, record_id, field, value, hlc_timestamp, author_id)
    values (current_setting('cg.coop_a')::uuid, 'ledger_transactions', 'rec-2', 'description',
            to_jsonb('spoof'::text), '1716638400001-0000-node-a', current_setting('cg.user_b')::uuid);
  exception when others then blocked := true;
  end;
  assert blocked, 'T9: sync_mutations accepted a spoofed author_id';
  raise notice 'PASS T9b  spoofed author_id rejected.';

  -- 9c: the log is append-only — UPDATE is denied
  blocked := false;
  begin
    update public.sync_mutations set field = 'tampered' where record_id = 'rec-1';
  exception when others then blocked := true;
  end;
  assert blocked, 'T9: a sync_mutations row was mutable (must be append-only)';
  raise notice 'PASS T9c  sync log is append-only (UPDATE denied).';
end$$;
reset role;

-- ============================================================================
-- T10 — tenant resolves via the membership fallback when the JWT omits coop_id
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated')::text, true);
set local role authenticated;
do $$
declare n int;
begin
  select count(*) into n from public.ledger_transactions;
  assert n = 1, format('T10: membership fallback failed — saw %s rows', n);
  raise notice 'PASS T10  coop resolved via membership fallback (no JWT claim).';
end$$;
reset role;

-- ============================================================================
-- T11 — the member-balance view is tenant-scoped
-- ============================================================================
select set_config('request.jwt.claims',
  jsonb_build_object('sub', current_setting('cg.user_a'), 'role', 'authenticated',
    'app_metadata', jsonb_build_object('coop_id', current_setting('cg.coop_a')))::text, true);
set local role authenticated;
do $$
declare n int; leaked int;
begin
  select count(*) into n from public.coop_member_balances;
  assert n = 2, format('T11: expected 2 balance rows for Coop A, saw %s', n);
  select count(*) into leaked from public.coop_member_balances
   where coop_id <> current_setting('cg.coop_a')::uuid;
  assert leaked = 0, 'T11: the balance view leaked another tenant''s members';
  raise notice 'PASS T11  member-balance view scoped to tenant.';
end$$;
reset role;

-- ============================================================================
-- T12 — a cooperative cannot lose its last owner (guard trigger)
-- ============================================================================
reset role;  -- owner role; the trigger fires regardless of RLS
do $$
declare blocked boolean := false;
begin
  begin
    delete from public.coop_members
     where coop_id = current_setting('cg.coop_a')::uuid and role = 'owner';
  exception when others then blocked := true;
  end;
  assert blocked, 'T12: the last owner of a cooperative was deleted';
  raise notice 'PASS T12  last-owner deletion blocked by guard trigger.';
end$$;

-- ============================================================================
do $$ begin raise notice ' '; raise notice '>>> ALL RLS CHECKS PASSED <<<'; end$$;

rollback;  -- leave the database exactly as we found it
-- ============================================================================
-- END — rls_cooperative_ledger.sql
-- ============================================================================
