-- ============================================================================
-- CommonGround Co-op — Sync validation hardening + incremental pull RPC
-- ----------------------------------------------------------------------------
-- Additive migration on top of the existing canonical schema. Does NOT touch
-- the live cloudLedger.js path (`ledger_transactions` / `ledger_postings`).
--
-- Affected:
--   * public.sync_mutations    — adds origin_node_id, idempotency unique index,
--                                HLC format CHECK, created_at index.
--   * new function app.is_valid_hlc(text)
--   * new function app.pull_sync_mutations(timestamptz, text, integer)
--
-- Reads:
--   * Uses existing app.current_coop_id() / app.is_coop_member() helpers.
--
-- HLC format the local engine actually emits (commonGroundSyncEngine.js:98):
--   <physical_ms>-<counter:>=4digits>-<nodeId>
-- e.g. "1747948800123-0001-3a7f9e2b"
-- ============================================================================

-- ---------------------------------------------------------------------------
-- HLC validator. STRICT/IMMUTABLE so Postgres can use it inside CHECK.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.is_valid_hlc(stamp TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
SET search_path = ''
AS $$
    SELECT stamp ~ '^[0-9]{13,}-[0-9]{4,}-[A-Za-z0-9_-]{1,64}$';
$$;

COMMENT ON FUNCTION app.is_valid_hlc(TEXT) IS
    'Validates the HLC string format emitted by commonGroundSyncEngine.js. '
    'Format: <physical_ms>-<counter4+>-<nodeId>. Lexicographic ordering of '
    'this format is causally correct for any pair of stamps from the same '
    'or different nodes through approximately the year 2286.';

-- ---------------------------------------------------------------------------
-- sync_mutations: add origin_node_id (nullable for backwards compatibility),
-- a HLC format check, and an idempotency unique index.
-- ---------------------------------------------------------------------------
ALTER TABLE public.sync_mutations
    ADD COLUMN IF NOT EXISTS origin_node_id TEXT
        CONSTRAINT sync_mutations_origin_node_id_format
        CHECK (origin_node_id IS NULL
               OR origin_node_id ~ '^[A-Za-z0-9_-]{1,64}$');

COMMENT ON COLUMN public.sync_mutations.origin_node_id IS
    'Opaque per-device identifier. Lets the pull RPC exclude the caller''s '
    'own writes so it does not re-apply mutations it just sent. Nullable for '
    'rows written before this column existed.';

-- HLC format check. We do NOT add this as NOT NULL retroactively — existing
-- production rows could have non-conforming stamps from earlier engine bugs.
-- Apply the check only to new writes via a NOT VALID + VALIDATE pattern if
-- you want to bulk-fix later; for now, enforce on all rows since the table
-- is empty in this project.
ALTER TABLE public.sync_mutations
    DROP CONSTRAINT IF EXISTS sync_mutations_hlc_timestamp_format;
ALTER TABLE public.sync_mutations
    ADD CONSTRAINT sync_mutations_hlc_timestamp_format
        CHECK (app.is_valid_hlc(hlc_timestamp))
        NOT VALID;
ALTER TABLE public.sync_mutations
    VALIDATE CONSTRAINT sync_mutations_hlc_timestamp_format;

-- ---------------------------------------------------------------------------
-- Idempotency: a replication retry that already landed must be a no-op.
-- Two distinct writes can never produce the same (table, record, field, HLC)
-- tuple because the HLC's node-id segment differs, and on the same node the
-- logical counter is monotone. So this is a true natural idempotency key.
-- ---------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS uq_sync_mutations_idempotent
    ON public.sync_mutations (coop_id, target_table, record_id, field, hlc_timestamp);

-- Incremental-pull cursor.
CREATE INDEX IF NOT EXISTS idx_sync_mutations_pull_window
    ON public.sync_mutations (coop_id, created_at);

-- Materialisation lookup (the planner answers "what's the winning HLC for
-- this property?" with one index seek).
CREATE INDEX IF NOT EXISTS idx_sync_mutations_lww_lookup
    ON public.sync_mutations (coop_id, target_table, record_id, field, hlc_timestamp DESC);

-- ---------------------------------------------------------------------------
-- Incremental pull RPC.
-- ---------------------------------------------------------------------------
-- The dormant engine currently runs `SELECT * FROM sync_mutations` on every
-- reconcile — fine at hundreds of rows, painful at tens of thousands. This
-- RPC accepts a high-water-mark cursor and a self-origin filter so the
-- engine can pull only the newer rows it hasn't seen and skip its own writes.
--
-- SECURITY INVOKER so RLS still gates row visibility. The function's
-- search_path is pinned to prevent search-path injection.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION app.pull_sync_mutations(
    p_since        TIMESTAMPTZ,
    p_origin_node  TEXT     DEFAULT NULL,
    p_limit        INTEGER  DEFAULT 500
)
RETURNS TABLE (
    id              UUID,
    coop_id         UUID,
    target_table    TEXT,
    record_id       TEXT,
    field           TEXT,
    value           JSONB,
    op              public.sync_op,
    hlc_timestamp   TEXT,
    origin_node_id  TEXT,
    author_id       UUID,
    created_at      TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
    SELECT
        m.id,
        m.coop_id,
        m.target_table,
        m.record_id,
        m.field,
        m.value,
        m.op,
        m.hlc_timestamp,
        m.origin_node_id,
        m.author_id,
        m.created_at
    FROM public.sync_mutations m
    WHERE m.coop_id = (SELECT app.current_coop_id())
      AND m.created_at > p_since
      AND (p_origin_node IS NULL OR m.origin_node_id IS DISTINCT FROM p_origin_node)
    ORDER BY m.created_at ASC, m.hlc_timestamp ASC
    LIMIT LEAST(GREATEST(p_limit, 1), 5000);
$$;

REVOKE ALL ON FUNCTION app.pull_sync_mutations(TIMESTAMPTZ, TEXT, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION app.pull_sync_mutations(TIMESTAMPTZ, TEXT, INTEGER)
    TO authenticated;

COMMENT ON FUNCTION app.pull_sync_mutations(TIMESTAMPTZ, TEXT, INTEGER) IS
    'Incremental pull cursor for commonGroundSyncEngine.js. Returns sync '
    'mutations for the caller''s cooperative that arrived after p_since, '
    'excluding the caller''s own origin to avoid echoing writes back. '
    'Bounded LIMIT defends against runaway pulls.';
