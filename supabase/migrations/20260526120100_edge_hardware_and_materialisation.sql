-- ============================================================================
-- CommonGround Co-op — Edge hardware registry + materialised analytics tables
-- ----------------------------------------------------------------------------
-- Additive migration. Adds the surface Task 3 (ESP32 firmware) needs to
-- replace the hardcoded HMAC PSK with per-node secrets, and adds materialised
-- analytics tables so dashboards can query current state without replaying
-- the sync_mutations outbox.
--
-- IMPORTANT: The dormant commonGroundSyncEngine.js does NOT currently write
-- to the materialised tables directly — it only writes to sync_mutations and
-- applies into local IndexedDB. The materialised tables are populated by a
-- projection job (future migration) or by direct dashboard queries against
-- sync_mutations until then. They are created here so Task 5 (cottage food)
-- and reporting work have a stable target shape.
-- ============================================================================

-- ===========================================================================
-- hardware_nodes — registered edge devices with per-device HMAC secrets
-- ===========================================================================
-- The id format ('Node-G02', 'Node-S01', etc.) matches what telemetryIngestor.js
-- expects in the gateId field and what cloudLedger / LoRa simulator emit.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.hardware_nodes (
    id              TEXT        PRIMARY KEY
                    CONSTRAINT hardware_nodes_id_format
                    CHECK (id ~ '^Node-[A-Za-z0-9-]{1,32}$'),

    coop_id         UUID        NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,

    node_type       TEXT        NOT NULL
                    CONSTRAINT hardware_nodes_type_allowed
                    CHECK (node_type IN ('soil','water','hive','temp','gate','weather','generic')),

    display_name    TEXT        CONSTRAINT hardware_nodes_display_name_len
                    CHECK (display_name IS NULL OR char_length(display_name) BETWEEN 1 AND 120),

    -- Per-node HMAC-SHA256 secret. Stored as BYTEA so timing-safe comparison
    -- is possible against the bytes produced by ESP32's mbedtls/md.h output.
    -- RLS + column-level revokes below ensure no member can SELECT this.
    hmac_secret     BYTEA       NOT NULL
                    CONSTRAINT hardware_nodes_secret_len
                    CHECK (octet_length(hmac_secret) BETWEEN 16 AND 64),

    -- Tolerated clock skew (seconds) for HMAC timestamp freshness checks.
    -- telemetryIngestor.js currently hardcodes 300s; making it per-node lets
    -- us tighten this for chatty gate sensors and loosen for solar nodes.
    nonce_window_s  INTEGER     NOT NULL DEFAULT 300
                    CONSTRAINT hardware_nodes_nonce_window_range
                    CHECK (nonce_window_s BETWEEN 30 AND 3600),

    last_seen_at    TIMESTAMPTZ,

    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hardware_nodes_coop
    ON public.hardware_nodes (coop_id);

CREATE TRIGGER trg_hardware_nodes_updated_at
    BEFORE UPDATE ON public.hardware_nodes
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.hardware_nodes ENABLE ROW LEVEL SECURITY;

-- Member-facing view that does NOT include hmac_secret. The view MUST be
-- declared `security_invoker = true` so it enforces the querying user's RLS
-- (not the view creator's). Without that, a member could read the view and
-- bypass the coop_id check on the underlying table — Supabase's lint
-- `security_definer_view` (level=ERROR) catches this case.
CREATE OR REPLACE VIEW public.hardware_nodes_public
    WITH (security_invoker = true) AS
    SELECT id, coop_id, node_type, display_name, nonce_window_s,
           last_seen_at, created_at, updated_at
    FROM public.hardware_nodes;

-- Revoke broad table grants from authenticated; they read via the view.
REVOKE ALL ON public.hardware_nodes FROM authenticated;
GRANT  SELECT ON public.hardware_nodes_public TO authenticated;

-- Members may register a new node and update its non-secret metadata, but
-- cannot ever read or rotate the secret. Secret provisioning is done by
-- service_role (which bypasses RLS) during physical device pairing.
GRANT INSERT (id, coop_id, node_type, display_name, hmac_secret, nonce_window_s)
    ON public.hardware_nodes TO authenticated;
GRANT UPDATE (display_name, node_type, nonce_window_s, last_seen_at)
    ON public.hardware_nodes TO authenticated;

CREATE POLICY hardware_nodes_insert_own_coop
    ON public.hardware_nodes
    FOR INSERT TO authenticated
    WITH CHECK (
        coop_id = (SELECT app.current_coop_id())
        AND app.is_coop_admin()
    );

CREATE POLICY hardware_nodes_select_own_coop
    ON public.hardware_nodes
    FOR SELECT TO authenticated
    USING (
        coop_id = (SELECT app.current_coop_id())
        AND app.is_coop_member(coop_id)
    );

CREATE POLICY hardware_nodes_update_own_coop
    ON public.hardware_nodes
    FOR UPDATE TO authenticated
    USING      (coop_id = (SELECT app.current_coop_id()) AND app.is_coop_member(coop_id))
    WITH CHECK (coop_id = (SELECT app.current_coop_id()) AND app.is_coop_member(coop_id));

-- ===========================================================================
-- livestock_logs — materialised time-series of livestock events
-- ===========================================================================
-- Mirrors the local IndexedDB store of the same name used by
-- commonGroundSyncEngine.js (line 246).
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.livestock_logs (
    id              TEXT        PRIMARY KEY,
    coop_id         UUID        NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,

    animal_ref      TEXT,                          -- optional pointer to a livestock head
    event_type      TEXT        NOT NULL
                    CONSTRAINT livestock_logs_event_type_allowed
                    CHECK (event_type IN (
                        'yield','health_check','breeding','medication','feed',
                        'death','birth','transfer','observation'
                    )),

    payload         JSONB       NOT NULL DEFAULT '{}'::jsonb,
    notes           TEXT,

    recorded_at     TIMESTAMPTZ NOT NULL,
    recorded_by     UUID,

    -- Property-level winning HLC per field; mirrors local `_timestamps`.
    -- Empty {} until populated by a projection from sync_mutations.
    field_hlcs      JSONB       NOT NULL DEFAULT '{}'::jsonb,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_livestock_logs_coop_recorded
    ON public.livestock_logs (coop_id, recorded_at DESC)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_livestock_logs_event_type
    ON public.livestock_logs (coop_id, event_type, recorded_at DESC)
    WHERE deleted_at IS NULL;

CREATE TRIGGER trg_livestock_logs_updated_at
    BEFORE UPDATE ON public.livestock_logs
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.livestock_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY livestock_logs_select_own_coop
    ON public.livestock_logs
    FOR SELECT TO authenticated
    USING (coop_id = (SELECT app.current_coop_id()) AND deleted_at IS NULL);

CREATE POLICY livestock_logs_insert_own_coop
    ON public.livestock_logs
    FOR INSERT TO authenticated
    WITH CHECK (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop());

CREATE POLICY livestock_logs_update_own_coop
    ON public.livestock_logs
    FOR UPDATE TO authenticated
    USING      (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop())
    WITH CHECK (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop());

GRANT SELECT, INSERT, UPDATE ON public.livestock_logs TO authenticated;

-- ===========================================================================
-- paddock_planner — current rotational grazing state
-- ===========================================================================
-- id is TEXT (not UUID) because the engine and existing app.js use slugs
-- like 'a', 'b', 'c' for paddocks. We accept that shape rather than forcing
-- a rename.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.paddock_planner (
    id              TEXT        PRIMARY KEY
                    CONSTRAINT paddock_planner_id_format
                    CHECK (id ~ '^[a-z][a-z0-9-]{0,62}$'),
    coop_id         UUID        NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,

    name            TEXT        NOT NULL,
    gate_id         TEXT        REFERENCES public.hardware_nodes(id) ON DELETE SET NULL,

    -- Engine writes a free-form status string; we accept any short value.
    current_status  TEXT        CONSTRAINT paddock_planner_status_len
                    CHECK (current_status IS NULL OR char_length(current_status) BETWEEN 1 AND 32),

    last_rotation_date  TIMESTAMPTZ,

    recovery_days_needed INTEGER
                    CONSTRAINT paddock_planner_recovery_nonneg
                    CHECK (recovery_days_needed IS NULL OR recovery_days_needed >= 0),

    height_inches   NUMERIC(6, 2)
                    CONSTRAINT paddock_planner_height_range
                    CHECK (height_inches IS NULL OR (height_inches >= 0 AND height_inches <= 96)),

    capacity_au     NUMERIC(8, 2)
                    CONSTRAINT paddock_planner_capacity_nonneg
                    CHECK (capacity_au IS NULL OR capacity_au >= 0),

    field_hlcs      JSONB       NOT NULL DEFAULT '{}'::jsonb,

    deleted_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_paddock_planner_coop
    ON public.paddock_planner (coop_id)
    WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_paddock_planner_gate
    ON public.paddock_planner (gate_id)
    WHERE gate_id IS NOT NULL;

CREATE TRIGGER trg_paddock_planner_updated_at
    BEFORE UPDATE ON public.paddock_planner
    FOR EACH ROW EXECUTE FUNCTION app.set_updated_at();

ALTER TABLE public.paddock_planner ENABLE ROW LEVEL SECURITY;

CREATE POLICY paddock_planner_select_own_coop
    ON public.paddock_planner
    FOR SELECT TO authenticated
    USING (coop_id = (SELECT app.current_coop_id()) AND deleted_at IS NULL);

CREATE POLICY paddock_planner_insert_own_coop
    ON public.paddock_planner
    FOR INSERT TO authenticated
    WITH CHECK (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop());

CREATE POLICY paddock_planner_update_own_coop
    ON public.paddock_planner
    FOR UPDATE TO authenticated
    USING      (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop())
    WITH CHECK (coop_id = (SELECT app.current_coop_id()) AND app.can_write_coop());

GRANT SELECT, INSERT, UPDATE ON public.paddock_planner TO authenticated;

-- ===========================================================================
-- hardware_telemetry — time-series sensor readings
-- ===========================================================================
-- Mirrors the local IndexedDB store. telemetryIngestor.js writes records
-- with shape: { node_id, state, voltage, logged_at }.
-- ===========================================================================
CREATE TABLE IF NOT EXISTS public.hardware_telemetry (
    id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    coop_id         UUID        NOT NULL REFERENCES public.cooperatives(id) ON DELETE CASCADE,
    node_id         TEXT        NOT NULL REFERENCES public.hardware_nodes(id) ON DELETE CASCADE,

    measurement     TEXT        NOT NULL
                    CONSTRAINT hardware_telemetry_measurement_format
                    CHECK (measurement ~ '^[a-z_][a-z0-9_]{0,31}$'),

    value_numeric   DOUBLE PRECISION,
    value_text      TEXT,
    value_bool      BOOLEAN,
    unit            TEXT,

    -- Battery voltage carried separately so dashboards can query it without
    -- parsing payload JSON for every row.
    battery_volt    NUMERIC(4, 2),

    rssi_dbm        SMALLINT
                    CONSTRAINT hardware_telemetry_rssi_range
                    CHECK (rssi_dbm IS NULL OR rssi_dbm BETWEEN -130 AND 0),
    snr_db          NUMERIC(5, 2),

    -- Trust marker. Only set TRUE by the telemetryIngestor when it has
    -- verified the HMAC against hardware_nodes.hmac_secret. RLS prevents
    -- members from setting it themselves.
    hmac_verified   BOOLEAN     NOT NULL DEFAULT FALSE,

    recorded_at     TIMESTAMPTZ NOT NULL,
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT hardware_telemetry_value_present
    CHECK (value_numeric IS NOT NULL
        OR value_text    IS NOT NULL
        OR value_bool    IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_hardware_telemetry_coop_recorded
    ON public.hardware_telemetry (coop_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_hardware_telemetry_node_recorded
    ON public.hardware_telemetry (node_id, recorded_at DESC);

CREATE INDEX IF NOT EXISTS idx_hardware_telemetry_measurement
    ON public.hardware_telemetry (coop_id, measurement, recorded_at DESC);

CREATE INDEX IF NOT EXISTS brin_hardware_telemetry_recorded_at
    ON public.hardware_telemetry USING BRIN (recorded_at)
    WITH (pages_per_range = 32);

ALTER TABLE public.hardware_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY hardware_telemetry_select_own_coop
    ON public.hardware_telemetry
    FOR SELECT TO authenticated
    USING (coop_id = (SELECT app.current_coop_id()) AND app.is_coop_member(coop_id));

-- Members may insert telemetry (e.g. a manual gate-event log from a phone),
-- but cannot claim hmac_verified — only the ingestor running under
-- service_role can flip that bit.
CREATE POLICY hardware_telemetry_insert_own_coop
    ON public.hardware_telemetry
    FOR INSERT TO authenticated
    WITH CHECK (
        coop_id = (SELECT app.current_coop_id())
        AND app.can_write_coop()
        AND hmac_verified = FALSE
        AND EXISTS (
            SELECT 1 FROM public.hardware_nodes n
            WHERE n.id = node_id AND n.coop_id = coop_id
        )
    );

GRANT SELECT, INSERT ON public.hardware_telemetry TO authenticated;

-- ===========================================================================
-- Final sanity check: every new table has RLS enabled.
-- ===========================================================================
DO $$
DECLARE
    v_table TEXT;
BEGIN
    FOR v_table IN
        SELECT unnest(ARRAY[
            'hardware_nodes','livestock_logs','paddock_planner','hardware_telemetry'
        ])
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_class c
            JOIN pg_namespace n ON n.oid = c.relnamespace
            WHERE n.nspname = 'public'
              AND c.relname = v_table
              AND c.relrowsecurity = TRUE
        ) THEN
            RAISE EXCEPTION 'RLS not enabled on public.%', v_table;
        END IF;
    END LOOP;
END $$;
