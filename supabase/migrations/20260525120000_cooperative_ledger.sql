-- ============================================================================
-- CommonGround — Cooperative Ledger: schema + Row-Level Security
-- Migration: 20260525120000_cooperative_ledger.sql
-- ----------------------------------------------------------------------------
-- WHAT THIS MIGRATION DELIVERS
--   * Multi-tenant foundation .... cooperatives, coop_members
--   * Cooperative ledger ......... ledger_transactions, ledger_postings
--   * Member balances ............ coop_member_balances (view, derived)
--   * Local-first sync substrate . sync_mutations (server mirror of the
--                                  IndexedDB mutation_outbox in
--                                  commonGroundSyncEngine.js)
--   * Strict RLS ................. every tenant table is isolated by the
--                                  caller's JWT `coop_id` claim AND an active
--                                  membership row. Roles gate writes.
--
-- TENANCY MODEL
--   Each cooperative is a tenant, keyed by a unique `domain`
--   (e.g. 'oakcreek.commonground.coop'). A signed-in user belongs to exactly
--   one active cooperative. RLS resolves the active tenant via
--   app.current_coop_id(), which reads, in priority order:
--     1. auth.jwt() -> app_metadata ->> 'coop_id'   (set by the auth hook)
--     2. auth.jwt() ->> 'coop_id'                   (top-level claim)
--     3. the caller's single active coop_members row (bootstrap fallback)
--   The JWT claim is populated by app.custom_access_token_hook() — see the
--   "HOW TO APPLY" notes at the bottom of this file.
--
-- HOW TO APPLY
--   Supabase CLI:  supabase db push
--   Supabase MCP:  apply_migration(name => 'cooperative_ledger', query => <file>)
--   psql:          psql "$DATABASE_URL" -f this_file.sql
--   Then enable the access-token hook (one-time) — see bottom of file.
--
-- MONEY
--   All amounts are stored as integer cents (bigint). The current app.js keeps
--   dollar floats in localStorage; the client adapter must multiply by 100 on
--   write and divide by 100 on read. Never store money as floating point.
--
-- SAFE TO RE-RUN
--   Tables/policies/functions are guarded so the migration is idempotent in a
--   development database. In production it should run exactly once, in order.
-- ============================================================================

begin;

-- ----------------------------------------------------------------------------
-- 0. Helper schema
-- ----------------------------------------------------------------------------
create schema if not exists app;
comment on schema app is 'CommonGround internal helpers: RLS predicates, triggers, RPCs.';

-- ----------------------------------------------------------------------------
-- 1. Enumerated types
-- ----------------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_type where typname = 'coop_member_role') then
    create type public.coop_member_role as enum ('owner', 'steward', 'member', 'viewer');
  end if;
  if not exists (select 1 from pg_type where typname = 'coop_member_status') then
    create type public.coop_member_status as enum ('active', 'invited', 'suspended');
  end if;
  if not exists (select 1 from pg_type where typname = 'ledger_direction') then
    create type public.ledger_direction as enum ('income', 'expense');
  end if;
  if not exists (select 1 from pg_type where typname = 'ledger_source') then
    create type public.ledger_source as enum (
      'csa_subscription', 'storefront', 'tool_library', 'farm_ops',
      'livestock', 'utilities', 'barter', 'cottage_food', 'grant', 'other'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'ledger_posting_kind') then
    create type public.ledger_posting_kind as enum (
      'revenue_share', 'labor_credit', 'expense_reimbursement',
      'member_draw', 'adjustment'
    );
  end if;
  if not exists (select 1 from pg_type where typname = 'sync_op') then
    create type public.sync_op as enum ('set', 'delete');
  end if;
end$$;

-- ----------------------------------------------------------------------------
-- 2. Tables
-- ----------------------------------------------------------------------------

-- 2.1 cooperatives — the tenant root
create table if not exists public.cooperatives (
  id              uuid primary key default gen_random_uuid(),
  domain          text not null unique
                    check (domain = lower(domain) and char_length(domain) between 3 and 253),
  name            text not null check (char_length(name) between 1 and 200),
  legal_entity    text,
  region_state    text check (region_state is null or char_length(region_state) = 2),
  region_country  text not null default 'US' check (char_length(region_country) = 2),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
comment on table public.cooperatives is 'Tenant root. One row per homestead / eco-village / co-op.';
comment on column public.cooperatives.domain is 'Unique tenant domain scope; mirrored into the JWT coop_id resolution.';
comment on column public.cooperatives.region_state is 'Two-letter state code — drives cottage-food rules (Task 5).';

-- 2.2 coop_members — membership of a user in a cooperative
create table if not exists public.coop_members (
  id            uuid primary key default gen_random_uuid(),
  coop_id       uuid not null references public.cooperatives (id) on delete cascade,
  user_id       uuid references auth.users (id) on delete set null,
  display_name  text not null check (char_length(display_name) between 1 and 120),
  role          public.coop_member_role   not null default 'member',
  status        public.coop_member_status not null default 'active',
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (coop_id, user_id),
  unique (id, coop_id)            -- composite-FK target for ledger tables
);
comment on table public.coop_members is 'Links auth.users to a cooperative with a role. user_id is null for not-yet-registered invitees.';

-- 2.3 ledger_transactions — the cooperative ledger
create table if not exists public.ledger_transactions (
  id            uuid primary key default gen_random_uuid(),
  coop_id       uuid not null references public.cooperatives (id) on delete cascade,
  occurred_on   date not null default current_date,
  description   text not null check (char_length(description) between 1 and 500),
  category      text check (category is null or char_length(category) <= 120),
  source        public.ledger_source    not null default 'other',
  direction     public.ledger_direction not null,
  amount_cents  bigint not null check (amount_cents >= 0),
  recorded_by   uuid,                                  -- coop_members.id (attribution)
  external_ref  text,                                  -- PayPal/Square/etc. id
  metadata      jsonb not null default '{}'::jsonb,
  hlc_timestamp text,                                  -- CRDT row clock (Hybrid Logical Clock)
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz,                           -- soft delete (CRDT-safe tombstone)
  unique (id, coop_id),                                -- composite-FK target for postings
  foreign key (recorded_by, coop_id)
    references public.coop_members (id, coop_id) on delete set null
);
comment on table public.ledger_transactions is 'Single-entry cooperative ledger. Money in integer cents. Soft-deleted, never hard-deleted, so CRDT sync can converge.';
comment on column public.ledger_transactions.hlc_timestamp is 'Hybrid Logical Clock stamp from the sync engine; last-write-wins ordering.';

-- 2.4 ledger_postings — per-member splits of a transaction (patronage / labor)
create table if not exists public.ledger_postings (
  id              uuid primary key default gen_random_uuid(),
  transaction_id  uuid not null,
  coop_id         uuid not null,
  member_id       uuid not null,
  kind            public.ledger_posting_kind not null,
  amount_cents    bigint not null,                     -- signed: +credit / -draw
  note            text check (note is null or char_length(note) <= 280),
  hlc_timestamp   text,
  created_at      timestamptz not null default now(),
  foreign key (transaction_id, coop_id)
    references public.ledger_transactions (id, coop_id) on delete cascade,
  foreign key (member_id, coop_id)
    references public.coop_members (id, coop_id) on delete restrict
);
comment on table public.ledger_postings is 'Splits a ledger transaction across members. Sum per member = member balance. Composite FKs make a cross-tenant posting structurally impossible.';

-- 2.5 sync_mutations — append-only server mirror of the IndexedDB outbox
create table if not exists public.sync_mutations (
  id            uuid primary key default gen_random_uuid(),
  coop_id       uuid not null references public.cooperatives (id) on delete cascade,
  target_table  text not null check (char_length(target_table) between 1 and 63),
  record_id     text not null,                         -- text: app IDs are not all UUIDs
  field         text not null check (char_length(field) between 1 and 63),
  value         jsonb,
  op            public.sync_op not null default 'set',
  hlc_timestamp text not null,
  author_id     uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  -- idempotency: a given field-mutation at a given HLC stamp lands at most once
  unique (coop_id, target_table, record_id, field, hlc_timestamp)
);
comment on table public.sync_mutations is 'Append-only field-level CRDT mutation log. Server mirror of mutation_outbox in commonGroundSyncEngine.js. Never updated or deleted.';

-- ----------------------------------------------------------------------------
-- 3. Indexes (RLS predicates and ledger queries depend on these)
-- ----------------------------------------------------------------------------
create index if not exists idx_coop_members_user           on public.coop_members (user_id);
create index if not exists idx_coop_members_coop           on public.coop_members (coop_id);
create index if not exists idx_ledger_tx_coop_date         on public.ledger_transactions (coop_id, occurred_on desc);
create index if not exists idx_ledger_tx_coop_source       on public.ledger_transactions (coop_id, source);
create index if not exists idx_ledger_tx_live              on public.ledger_transactions (coop_id) where deleted_at is null;
create index if not exists idx_ledger_postings_tx          on public.ledger_postings (transaction_id);
create index if not exists idx_ledger_postings_member      on public.ledger_postings (member_id);
create index if not exists idx_ledger_postings_coop        on public.ledger_postings (coop_id);
create index if not exists idx_sync_mutations_record       on public.sync_mutations (coop_id, target_table, record_id);
create index if not exists idx_sync_mutations_stream       on public.sync_mutations (coop_id, created_at desc);

-- ----------------------------------------------------------------------------
-- 4. Derived view — member balances
-- ----------------------------------------------------------------------------
-- security_invoker=true: base-table RLS is enforced as the *querying* user,
-- so the view cannot leak balances across tenants. Requires Postgres 15+.
create or replace view public.coop_member_balances
  with (security_invoker = true) as
select
  m.coop_id,
  m.id           as member_id,
  m.display_name,
  m.role,
  m.status,
  coalesce(sum(p.amount_cents) filter (where t.deleted_at is null), 0)::bigint
                 as balance_cents
from public.coop_members m
left join public.ledger_postings     p on p.member_id      = m.id
left join public.ledger_transactions t on t.id             = p.transaction_id
group by m.coop_id, m.id, m.display_name, m.role, m.status;
comment on view public.coop_member_balances is 'Live member balance = sum of postings on non-deleted transactions. Replaces the cg_payroll localStorage map with an auditable trail.';

-- ----------------------------------------------------------------------------
-- 5. RLS helper functions
--    All are SECURITY DEFINER with a locked search_path so they can read
--    coop_members without tripping RLS — this is what prevents the classic
--    "policy on coop_members calls a function that queries coop_members"
--    infinite-recursion error.
-- ----------------------------------------------------------------------------

-- 5.1 Resolve the caller's active cooperative.
create or replace function app.current_coop_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select coalesce(
    nullif(auth.jwt() -> 'app_metadata' ->> 'coop_id', ''),
    nullif(auth.jwt() ->> 'coop_id', ''),
    (select m.coop_id::text
       from public.coop_members m
      where m.user_id = auth.uid()
        and m.status  = 'active'
      order by m.created_at
      limit 1)
  )::uuid;
$$;
comment on function app.current_coop_id() is 'Active tenant for the caller: JWT app_metadata.coop_id, then top-level coop_id claim, then the single active membership row.';

-- 5.2 Is the caller an active member of a given cooperative?
create or replace function app.is_coop_member(target_coop uuid)
returns boolean
language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.coop_members m
    where m.user_id = auth.uid()
      and m.coop_id = target_coop
      and m.status  = 'active'
  );
$$;

-- 5.3 The caller's role inside their active cooperative.
create or replace function app.current_coop_role()
returns public.coop_member_role
language sql stable security definer set search_path = ''
as $$
  select m.role
    from public.coop_members m
   where m.user_id = auth.uid()
     and m.coop_id = app.current_coop_id()
     and m.status  = 'active'
   limit 1;
$$;

-- 5.4 The caller's coop_members.id inside their active cooperative.
create or replace function app.current_member_id()
returns uuid
language sql stable security definer set search_path = ''
as $$
  select m.id
    from public.coop_members m
   where m.user_id = auth.uid()
     and m.coop_id = app.current_coop_id()
     and m.status  = 'active'
   limit 1;
$$;

-- 5.5 May the caller write coop data at all? (viewers may not)
create or replace function app.can_write_coop()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.current_coop_role() in ('owner', 'steward', 'member');
$$;

-- 5.6 Is the caller an owner or steward (an administrator)?
create or replace function app.is_coop_admin()
returns boolean
language sql stable security definer set search_path = ''
as $$
  select app.current_coop_role() in ('owner', 'steward');
$$;

grant usage on schema app to authenticated;
grant execute on function
  app.current_coop_id(),
  app.is_coop_member(uuid),
  app.current_coop_role(),
  app.current_member_id(),
  app.can_write_coop(),
  app.is_coop_admin()
  to authenticated;

-- ----------------------------------------------------------------------------
-- 6. Trigger functions
-- ----------------------------------------------------------------------------

-- 6.1 Maintain updated_at.
create or replace function app.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 6.2 Stamp recorded_by on ledger transactions when the client omits it.
create or replace function app.stamp_ledger_transaction()
returns trigger language plpgsql set search_path = '' as $$
begin
  if new.recorded_by is null then
    new.recorded_by := app.current_member_id();
  end if;
  return new;
end;
$$;

-- 6.3 Stop a non-admin from escalating their own role / status / tenant.
create or replace function app.guard_coop_member_changes()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if not app.is_coop_admin() then
    if new.role    is distinct from old.role
    or new.status  is distinct from old.status
    or new.coop_id is distinct from old.coop_id
    or new.user_id is distinct from old.user_id then
      raise exception
        'Only a coop owner or steward may change role, status, tenant, or user link.'
        using errcode = 'check_violation';
    end if;
  end if;
  return new;
end;
$$;

-- 6.4 A cooperative must always keep at least one active owner.
create or replace function app.guard_last_owner()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  remaining integer;
begin
  if old.role <> 'owner' then
    return coalesce(new, old);
  end if;
  -- Tenant teardown: if the parent cooperative is already gone (cascade
  -- delete), there is no "at least one owner" invariant left to protect.
  if not exists (select 1 from public.cooperatives where id = old.coop_id) then
    return coalesce(new, old);
  end if;
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

-- 6.5 Wire triggers.
drop trigger if exists trg_cooperatives_updated     on public.cooperatives;
create trigger trg_cooperatives_updated
  before update on public.cooperatives
  for each row execute function app.set_updated_at();

drop trigger if exists trg_coop_members_updated     on public.coop_members;
create trigger trg_coop_members_updated
  before update on public.coop_members
  for each row execute function app.set_updated_at();

drop trigger if exists trg_coop_members_guard       on public.coop_members;
create trigger trg_coop_members_guard
  before update on public.coop_members
  for each row execute function app.guard_coop_member_changes();

drop trigger if exists trg_coop_members_last_owner  on public.coop_members;
create trigger trg_coop_members_last_owner
  before update or delete on public.coop_members
  for each row execute function app.guard_last_owner();

drop trigger if exists trg_ledger_tx_updated        on public.ledger_transactions;
create trigger trg_ledger_tx_updated
  before update on public.ledger_transactions
  for each row execute function app.set_updated_at();

drop trigger if exists trg_ledger_tx_stamp          on public.ledger_transactions;
create trigger trg_ledger_tx_stamp
  before insert on public.ledger_transactions
  for each row execute function app.stamp_ledger_transaction();

-- ----------------------------------------------------------------------------
-- 7. Grants  (RLS — not GRANTs — is the security boundary; these just expose
--             the verbs each policy set needs to the authenticated role.)
-- ----------------------------------------------------------------------------
grant select, update                 on public.cooperatives        to authenticated;
grant select, insert, update, delete on public.coop_members        to authenticated;
grant select, insert, update, delete on public.ledger_transactions to authenticated;
grant select, insert, update, delete on public.ledger_postings     to authenticated;
grant select, insert                 on public.sync_mutations      to authenticated;
grant select                         on public.coop_member_balances to authenticated;

-- The cooperative ledger is authenticated-only. Strip the grants Supabase's
-- default privileges auto-assign to the anon role (RLS denies anon anyway;
-- this makes it explicit at the privilege layer too).
revoke all on public.cooperatives, public.coop_members, public.ledger_transactions,
              public.ledger_postings, public.sync_mutations, public.coop_member_balances
  from anon;

-- ----------------------------------------------------------------------------
-- 8. Row-Level Security
-- ----------------------------------------------------------------------------
-- ENABLE (not FORCE): client traffic always arrives as anon / authenticated /
-- service_role, none of which own these tables, so RLS is fully enforced for
-- every real caller. service_role keeps its intended BYPASSRLS. FORCE is
-- omitted on purpose — it would also subject the table-owner role to RLS and
-- break migrations, the bootstrap RPC, and break-glass admin queries.
alter table public.cooperatives        enable row level security;
alter table public.coop_members        enable row level security;
alter table public.ledger_transactions enable row level security;
alter table public.ledger_postings     enable row level security;
alter table public.sync_mutations      enable row level security;

-- 8.1 cooperatives ------------------------------------------------------------
-- Read your own cooperative only. There is deliberately no INSERT policy:
-- cooperatives are created through app.create_cooperative() (section 9), which
-- atomically creates the tenant and its first owner. Only owners may edit it.
drop policy if exists coop_select on public.cooperatives;
create policy coop_select on public.cooperatives
  for select to authenticated
  using (app.is_coop_member(id));

drop policy if exists coop_update on public.cooperatives;
create policy coop_update on public.cooperatives
  for update to authenticated
  using      (id = (select app.current_coop_id()) and app.current_coop_role() = 'owner')
  with check (id = (select app.current_coop_id()) and app.current_coop_role() = 'owner');

-- 8.2 coop_members ------------------------------------------------------------
-- See everyone in your coop. Owners/stewards manage membership. A member may
-- edit their own row (display name only — section 6.3 blocks role escalation).
drop policy if exists members_select on public.coop_members;
create policy members_select on public.coop_members
  for select to authenticated
  using (app.is_coop_member(coop_id));

drop policy if exists members_insert on public.coop_members;
create policy members_insert on public.coop_members
  for insert to authenticated
  with check (coop_id = (select app.current_coop_id()) and app.is_coop_admin());

drop policy if exists members_update on public.coop_members;
create policy members_update on public.coop_members
  for update to authenticated
  using (
    coop_id = (select app.current_coop_id())
    and (app.is_coop_admin() or user_id = (select auth.uid()))
  )
  with check (
    coop_id = (select app.current_coop_id())
    and (app.is_coop_admin() or user_id = (select auth.uid()))
  );

drop policy if exists members_delete on public.coop_members;
create policy members_delete on public.coop_members
  for delete to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_admin());

-- 8.3 ledger_transactions -----------------------------------------------------
-- Read all ledger rows in your coop. Members+ may add. Authors may edit their
-- own rows; admins may edit any. Only admins may hard-delete (soft delete via
-- deleted_at is the norm and is just an UPDATE).
drop policy if exists ledger_tx_select on public.ledger_transactions;
create policy ledger_tx_select on public.ledger_transactions
  for select to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_member(coop_id));

drop policy if exists ledger_tx_insert on public.ledger_transactions;
create policy ledger_tx_insert on public.ledger_transactions
  for insert to authenticated
  with check (coop_id = (select app.current_coop_id()) and app.can_write_coop());

drop policy if exists ledger_tx_update on public.ledger_transactions;
create policy ledger_tx_update on public.ledger_transactions
  for update to authenticated
  using (
    coop_id = (select app.current_coop_id())
    and (app.is_coop_admin() or recorded_by = (select app.current_member_id()))
  )
  with check (
    coop_id = (select app.current_coop_id())
    and (app.is_coop_admin() or recorded_by = (select app.current_member_id()))
  );

drop policy if exists ledger_tx_delete on public.ledger_transactions;
create policy ledger_tx_delete on public.ledger_transactions
  for delete to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_admin());

-- 8.4 ledger_postings ---------------------------------------------------------
-- Read all in-coop postings. Members+ may add. Postings move money, so only
-- admins may edit or delete them after creation.
drop policy if exists ledger_post_select on public.ledger_postings;
create policy ledger_post_select on public.ledger_postings
  for select to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_member(coop_id));

drop policy if exists ledger_post_insert on public.ledger_postings;
create policy ledger_post_insert on public.ledger_postings
  for insert to authenticated
  with check (coop_id = (select app.current_coop_id()) and app.can_write_coop());

drop policy if exists ledger_post_update on public.ledger_postings;
create policy ledger_post_update on public.ledger_postings
  for update to authenticated
  using      (coop_id = (select app.current_coop_id()) and app.is_coop_admin())
  with check (coop_id = (select app.current_coop_id()) and app.is_coop_admin());

drop policy if exists ledger_post_delete on public.ledger_postings;
create policy ledger_post_delete on public.ledger_postings
  for delete to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_admin());

-- 8.5 sync_mutations ----------------------------------------------------------
-- Read your coop's mutation stream. Members+ may append, and only as
-- themselves. The log is append-only: no UPDATE or DELETE policy exists, so
-- those verbs are denied for every caller.
drop policy if exists sync_select on public.sync_mutations;
create policy sync_select on public.sync_mutations
  for select to authenticated
  using (coop_id = (select app.current_coop_id()) and app.is_coop_member(coop_id));

drop policy if exists sync_insert on public.sync_mutations;
create policy sync_insert on public.sync_mutations
  for insert to authenticated
  with check (
    coop_id   = (select app.current_coop_id())
    and app.can_write_coop()
    and author_id = (select auth.uid())
  );

-- ----------------------------------------------------------------------------
-- 9. Bootstrap RPC — create a cooperative and become its first owner
-- ----------------------------------------------------------------------------
create or replace function app.create_cooperative(
  p_domain         text,
  p_name           text,
  p_display_name   text,
  p_region_state   text default null,
  p_region_country text default 'US'
)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
  v_coop uuid;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required to create a cooperative.'
      using errcode = 'insufficient_privilege';
  end if;

  insert into public.cooperatives (domain, name, region_state, region_country)
  values (lower(p_domain), p_name, upper(p_region_state), upper(p_region_country))
  returning id into v_coop;

  insert into public.coop_members (coop_id, user_id, display_name, role, status)
  values (v_coop, auth.uid(), p_display_name, 'owner', 'active');

  return v_coop;
end;
$$;
comment on function app.create_cooperative is 'Atomically creates a tenant and its first active owner (the caller). The only supported way to create a cooperative from the client.';

grant execute on function
  app.create_cooperative(text, text, text, text, text)
  to authenticated;

-- ----------------------------------------------------------------------------
-- 10. Custom Access Token hook — injects coop_id into every issued JWT
-- ----------------------------------------------------------------------------
-- After this migration runs, enable the hook ONCE:
--   Supabase Dashboard -> Authentication -> Hooks -> Custom Access Token
--   -> select schema "app", function "custom_access_token_hook".
-- Until it is enabled, app.current_coop_id() still works via the membership
-- fallback (section 5.1) — the hook simply makes resolution claim-based and
-- removes a per-request lookup.
create or replace function app.custom_access_token_hook(event jsonb)
returns jsonb
language plpgsql stable set search_path = ''
as $$
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
comment on function app.custom_access_token_hook is 'Supabase auth hook: copies the active coop_id into JWT app_metadata so RLS resolves the tenant from the token.';

-- The hook executes as the supabase_auth_admin role.
grant usage  on schema app                  to supabase_auth_admin;
grant execute on function app.custom_access_token_hook(jsonb) to supabase_auth_admin;
revoke execute on function app.custom_access_token_hook(jsonb) from authenticated, anon, public;

-- The hook reads coop_members; let the auth admin role do so under RLS.
grant select on public.coop_members to supabase_auth_admin;
drop policy if exists members_auth_admin_read on public.coop_members;
create policy members_auth_admin_read on public.coop_members
  for select to supabase_auth_admin
  using (true);

commit;

-- ============================================================================
-- END — 20260525120000_cooperative_ledger.sql
-- Verify with: supabase/tests/rls_cooperative_ledger.sql
-- ============================================================================
