/**
 * CommonGround — Telemetry Ingestion Layer (TelemetryAgent)
 * ---------------------------------------------------------------------------
 * HMAC-authenticated webhook receiver for edge sensors (ESP32 gates, LoRa
 * relays). Used in two contexts:
 *
 *   1. Browser / orchestrator diagnostics — accepts a LocalFirstSyncEngine
 *      and writes through to IndexedDB. Signature verification needs a
 *      `secretResolver` (or an explicit `legacyDevKey` opt-in for the
 *      orchestrator's self-test path).
 *
 *   2. Edge gateway (Raspberry Pi) — accepts a Supabase admin client and a
 *      `secretResolver` backed by the public.hardware_nodes table. The
 *      hardcoded PSK is GONE; every sensor signs with its own secret.
 *
 * Cross-language signature contract:
 *
 *   * Body = JSON object with keys inserted in alphabetical order, no
 *     whitespace. canonicalJsonStringify() below reproduces this from any
 *     in-memory object; the ESP32 firmware builds the same byte stream
 *     directly with snprintf().
 *   * HMAC = HMAC-SHA256 of the body bytes, lower-case hex.
 *   * Header `X-CommonGround-Signature` carries the hex; comparison is
 *     timing-safe.
 *   * Header `X-Idempotency-Key` carries a per-message ID. Duplicates are
 *     ACKed but not re-processed.
 *
 * License: MIT
 * --------------------------------------------------------------------------- */

let crypto;
try {
    crypto = await import('crypto').then(m => m.default || m).catch(() => null);
} catch (_e) {
    // Browser context — crypto stays null; HMAC verification short-circuits
    // and returns 503 in browser, because verifying signatures meaningfully
    // requires the Node `crypto` module's timing-safe primitives.
}

// ---------------------------------------------------------------------------
// canonicalJsonStringify
// ---------------------------------------------------------------------------
// Recursively serialise a value with object keys sorted alphabetically. The
// output is canonical: two structurally-equal inputs always produce the
// same bytes, regardless of insertion order at construction time. This is
// what the ESP32 firmware (and any other signer) must reproduce byte-for-
// byte to make HMAC verification work.
// ---------------------------------------------------------------------------
export function canonicalJsonStringify(obj) {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) {
        return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k =>
        JSON.stringify(k) + ':' + canonicalJsonStringify(obj[k])
    ).join(',') + '}';
}

// ---------------------------------------------------------------------------
// createSupabaseSecretResolver
// ---------------------------------------------------------------------------
// Factory that returns an async (nodeId) => Buffer function backed by the
// public.hardware_nodes table. Secrets are cached in-process for `ttlMs`
// to spare the DB; cache invalidation is by expiry only (rotating a
// secret means waiting up to ttlMs or process restart — both acceptable
// at edge-gateway scale).
//
// The supabaseAdmin client MUST be created with the service-role key.
// hmac_secret is invisible to authenticated members by design.
// ---------------------------------------------------------------------------
export function createSupabaseSecretResolver(supabaseAdmin, opts = {}) {
    if (!supabaseAdmin) throw new Error('createSupabaseSecretResolver requires a service-role Supabase client');
    const ttlMs = Number.isFinite(opts.ttlMs) ? opts.ttlMs : 60_000;
    const cache = new Map(); // nodeId -> { secret: Buffer, until: number }

    return async function resolve(nodeId) {
        const hit = cache.get(nodeId);
        if (hit && hit.until > Date.now()) return hit.secret;

        const { data, error } = await supabaseAdmin
            .from('hardware_nodes')
            .select('hmac_secret, nonce_window_s, coop_id')
            .eq('id', nodeId)
            .maybeSingle();
        if (error) throw new Error(`secret lookup failed for ${nodeId}: ${error.message}`);
        if (!data) return null;

        // Supabase returns BYTEA as a base64 string by default via PostgREST,
        // or as `\x...` hex with some clients. Handle both.
        const secret = decodeSecretBlob(data.hmac_secret);
        cache.set(nodeId, {
            secret,
            until: Date.now() + ttlMs,
            nonceWindowS: data.nonce_window_s,
            coopId: data.coop_id
        });
        return secret;
    };
}

function decodeSecretBlob(blob) {
    if (Buffer.isBuffer(blob)) return blob;
    if (typeof blob !== 'string') {
        throw new Error('hmac_secret is not a buffer or string');
    }
    // Postgres-style hex: "\\x4e2c1f..."
    if (blob.startsWith('\\x')) return Buffer.from(blob.slice(2), 'hex');
    // Base64
    if (/^[A-Za-z0-9+/=]+$/.test(blob)) return Buffer.from(blob, 'base64');
    // Hex literal
    if (/^[0-9a-fA-F]+$/.test(blob) && blob.length % 2 === 0) return Buffer.from(blob, 'hex');
    throw new Error('unrecognised hmac_secret encoding');
}

// ---------------------------------------------------------------------------
// TelemetryAgent
// ---------------------------------------------------------------------------
export class TelemetryAgent {

    /**
     * @param {object|LocalFirstSyncEngine} arg1
     *   Either a LocalFirstSyncEngine (legacy positional form) or an options
     *   object:
     *     {
     *       syncEngine,         // optional; used in browser/orchestrator mode
     *       supabaseAdmin,      // optional; service-role client for gateway mode
     *       secretResolver,     // optional; async (nodeId) => Buffer
     *       legacyDevKey,       // optional bool; if true, accept the deprecated
     *                           // 'cg-secret-key-2026' PSK for all nodes.
     *                           // ONLY for orchestrator self-tests.
     *       defaultRotationCooldownMs, // optional, default 30000
     *       defaultTimestampWindowMs   // optional, default 300000
     *     }
     */
    constructor(arg1) {
        const isOptions = (arg1 && typeof arg1 === 'object'
            && typeof arg1.saveRecordLocally !== 'function');
        const opts = isOptions ? arg1 : { syncEngine: arg1 };

        this.syncEngine     = opts.syncEngine     || null;
        this.supabaseAdmin  = opts.supabaseAdmin  || null;
        this.secretResolver = opts.secretResolver || null;
        this.legacyDevKey   = !!opts.legacyDevKey;

        if (!this.syncEngine && !this.supabaseAdmin) {
            throw new Error(
                'TelemetryAgent requires a syncEngine, a supabaseAdmin, ' +
                'or both.'
            );
        }

        // Auto-build a resolver from supabaseAdmin if the caller didn't pass one.
        if (!this.secretResolver && this.supabaseAdmin) {
            this.secretResolver = createSupabaseSecretResolver(this.supabaseAdmin);
        }

        if (this.legacyDevKey) {
            // eslint-disable-next-line no-console
            console.warn(
                '[TelemetryAgent] legacyDevKey mode is ENABLED. This trusts ' +
                'the deprecated pre-shared key "cg-secret-key-2026" for every ' +
                'sensor. Use ONLY for the systemOrchestrator self-test path. ' +
                'Disable in production.'
            );
            const legacyBuf = Buffer.from('cg-secret-key-2026', 'utf8');
            const upstream = this.secretResolver;
            this.secretResolver = async (nodeId) => {
                if (upstream) {
                    try {
                        const s = await upstream(nodeId);
                        if (s) return s;
                    } catch (_) { /* fall through to legacy */ }
                }
                return legacyBuf;
            };
        }

        this.processedMessageIds          = new Map();
        this.lastRotationTimes            = new Map();
        this.rotationCooldownMs           = opts.defaultRotationCooldownMs ?? 30_000;
        this.timestampWindowMs            = opts.defaultTimestampWindowMs  ?? 300_000;

        // HLC state for gateway-side mutation propagation (T3.1).
        this._hlcLastPhysical = 0;
        this._hlcCounter      = 0;
    }

    // -----------------------------------------------------------------------
    // POST /api/v1/telemetry/gate-state
    // -----------------------------------------------------------------------
    async handleGateStateWebhook(req, res) {
        const headers = req.headers || {};
        const body    = req.body    || {};
        const { gateId, status, timestamp, batteryVoltage, messageId } = body;

        // 1. Body validation -------------------------------------------------
        if (!gateId || !status) {
            return reply(res, 400, { error: 'Validation failed: gateId or status missing.' });
        }
        if (typeof gateId !== 'string' || gateId.length > 64) {
            return reply(res, 400, { error: 'Validation failed: gateId malformed.' });
        }
        if (typeof status !== 'string' || status.length > 32) {
            return reply(res, 400, { error: 'Validation failed: status malformed.' });
        }

        // 2. Timestamp freshness -------------------------------------------
        const now     = Date.now();
        const msgTime = timestamp ? new Date(timestamp).getTime() : null;
        if (!msgTime || Number.isNaN(msgTime) ||
            Math.abs(now - msgTime) > this.timestampWindowMs) {
            return reply(res, 401, { error: 'Unauthorized: timestamp expired or missing.' });
        }

        // 3. HMAC signature verification ------------------------------------
        if (!crypto) {
            return reply(res, 503, { error: 'Server: crypto module unavailable in this context.' });
        }
        const signature = headers['x-commonground-signature']
                       || headers['X-CommonGround-Signature']
                       || body.signature;
        if (!signature || typeof signature !== 'string' ||
            !/^[a-f0-9]{64}$/i.test(signature)) {
            return reply(res, 401, { error: 'Unauthorized: missing or malformed signature.' });
        }

        let secret;
        try {
            secret = this.secretResolver ? await this.secretResolver(gateId) : null;
        } catch (e) {
            console.error('[TelemetryAgent] secret resolver threw:', e);
            return reply(res, 503, { error: 'Server: secret resolver failed.' });
        }
        if (!secret) {
            return reply(res, 401, { error: 'Unauthorized: unknown gate id.' });
        }

        const verifyBody = { ...body };
        delete verifyBody.signature;

        const expected = crypto
            .createHmac('sha256', secret)
            .update(canonicalJsonStringify(verifyBody))
            .digest('hex');

        let signaturesMatch = false;
        try {
            const a = Buffer.from(signature.toLowerCase(), 'hex');
            const b = Buffer.from(expected, 'hex');
            signaturesMatch = a.length === b.length && crypto.timingSafeEqual(a, b);
        } catch (_e) {
            signaturesMatch = false;
        }
        if (!signaturesMatch) {
            return reply(res, 401, { error: 'Unauthorized: signature verification failed.' });
        }

        // 4. Idempotency ---------------------------------------------------
        const msgId = headers['x-idempotency-key']
                   || headers['X-Idempotency-Key']
                   || messageId;
        if (msgId) {
            if (this.processedMessageIds.has(msgId)) {
                return reply(res, 200, {
                    status: 'ACK',
                    processed: false,
                    event: 'DUPLICATE_FILTERED'
                });
            }
            this.processedMessageIds.set(msgId, now);
            this._cleanIdempotencyCache();
        }

        // 5. Persistence ----------------------------------------------------
        try {
            await this._persistGateEvent({
                gateId,
                status,
                timestamp: timestamp || new Date().toISOString(),
                batteryVoltage: Number.isFinite(batteryVoltage) ? batteryVoltage : 3.7
            });
        } catch (err) {
            console.error('[TelemetryAgent] persistence failed:', err);
            return reply(res, 500, { error: 'Persistence failure.', details: err.message });
        }

        // 6. Herd rotation (debounced) -------------------------------------
        if (status === 'OPEN' || status === 'OPEN_TEMPORARY') {
            const last = this.lastRotationTimes.get(gateId) || 0;
            if (now - last < this.rotationCooldownMs) {
                return reply(res, 200, {
                    status: 'ACK',
                    processed: false,
                    event: 'GATE_BOUNCE_DEBOUNCED'
                });
            }
            this.lastRotationTimes.set(gateId, now);
            await this.processAutomatedHerdRotation(gateId);
        }

        return reply(res, 200, {
            status: 'ACK',
            processed: true,
            event: 'GATE_INGESTION_SUCCESS'
        });
    }

    // -----------------------------------------------------------------------
    // Persistence dispatch
    // -----------------------------------------------------------------------
    async _persistGateEvent({ gateId, status, timestamp, batteryVoltage }) {
        if (this.supabaseAdmin) {
            // Look up the node's coop_id so we can satisfy the FK + RLS shape
            // on hardware_telemetry. Even though service_role bypasses RLS,
            // including coop_id keeps the row queryable by member sessions.
            const { data: nodeRow, error: nodeErr } = await this.supabaseAdmin
                .from('hardware_nodes')
                .select('coop_id')
                .eq('id', gateId)
                .maybeSingle();
            if (nodeErr) throw nodeErr;
            if (!nodeRow) throw new Error(`gateId ${gateId} not registered`);

            const { error: insertErr } = await this.supabaseAdmin
                .from('hardware_telemetry')
                .insert({
                    coop_id:       nodeRow.coop_id,
                    node_id:       gateId,
                    measurement:   'gate_state',
                    value_text:    status,
                    battery_volt:  batteryVoltage,
                    hmac_verified: true,
                    recorded_at:   timestamp
                });
            if (insertErr) throw insertErr;

            // T3.1: Also emit a sync_mutations row so member devices learn
            // about the gate event via their incremental pull (instead of
            // waiting for an explicit fetch of hardware_telemetry). Failure
            // here is non-fatal — the source-of-truth row is already in
            // hardware_telemetry; mesh propagation is best-effort.
            const hlcTimestamp = this._mintHlcStamp(gateId);
            const { error: syncErr } = await this.supabaseAdmin
                .from('sync_mutations')
                .insert({
                    coop_id:        nodeRow.coop_id,
                    target_table:   'hardware_telemetry',
                    record_id:      `${gateId}:${timestamp}`,
                    field:          'state',
                    value:          status,
                    op:             'set',
                    hlc_timestamp:  hlcTimestamp,
                    origin_node_id: gateId
                });
            if (syncErr) {
                console.warn('[TelemetryAgent] sync_mutations propagation failed (non-fatal):', syncErr.message || syncErr);
            }

            // Touch last_seen_at — best-effort.
            await this.supabaseAdmin
                .from('hardware_nodes')
                .update({ last_seen_at: new Date().toISOString() })
                .eq('id', gateId);
        }

        if (this.syncEngine) {
            // Keep the local-first IndexedDB write so the browser UI updates
            // even when the ingestor runs in the same process.
            await this.syncEngine.saveRecordLocally('hardware_telemetry', {
                node_id:     gateId,
                state:       status,
                voltage:     batteryVoltage,
                logged_at:   timestamp,
                hmac_verified: true
            });
        }
    }

    // -----------------------------------------------------------------------
    // Herd rotation
    // -----------------------------------------------------------------------
    async processAutomatedHerdRotation(gateId) {
        let targetPaddock = null;

        if (this.supabaseAdmin) {
            const { data, error } = await this.supabaseAdmin
                .from('paddock_planner')
                .select('id, coop_id, name')
                .eq('gate_id', gateId)
                .is('deleted_at', null)
                .maybeSingle();
            if (!error && data) targetPaddock = data;
        }
        if (!targetPaddock && this.syncEngine && typeof this.syncEngine.fetchActivePaddockByGate === 'function') {
            targetPaddock = await this.syncEngine.fetchActivePaddockByGate(gateId);
        }
        if (!targetPaddock) return;

        const update = {
            id:                   targetPaddock.id,
            name:                 targetPaddock.name || 'Paddock',
            current_status:       'RESTING',
            last_rotation_date:   new Date().toISOString(),
            recovery_days_needed: 30
        };

        if (this.supabaseAdmin && targetPaddock.coop_id) {
            await this.supabaseAdmin
                .from('paddock_planner')
                .update({
                    current_status:       update.current_status,
                    last_rotation_date:   update.last_rotation_date,
                    recovery_days_needed: update.recovery_days_needed
                })
                .eq('id', targetPaddock.id)
                .eq('coop_id', targetPaddock.coop_id);
        }
        if (this.syncEngine) {
            await this.syncEngine.saveRecordLocally('paddock_planner', update);
        }

        if (typeof globalThis.window !== 'undefined' && typeof CustomEvent !== 'undefined') {
            globalThis.window.dispatchEvent(new CustomEvent('cg-herd-rotated', { detail: update }));
        }
    }

    // -----------------------------------------------------------------------
    // Internal: HLC stamp minter for gateway-originated mutations.
    // The gateway has no LocalFirstSyncEngine (it runs in pure Node, no
    // IndexedDB), so we mint a fresh HLC string per event. Per-process
    // counter handles within-millisecond collisions.
    // -----------------------------------------------------------------------
    _mintHlcStamp(nodeId) {
        const now = Date.now();
        if (now > this._hlcLastPhysical) {
            this._hlcLastPhysical = now;
            this._hlcCounter      = 0;
        } else {
            this._hlcCounter++;
        }
        const counter = String(this._hlcCounter).padStart(4, '0');
        // Node id segment is the gateway's own identifier so peers can tell
        // gateway-originated mutations from device-originated ones.
        return `${this._hlcLastPhysical}-${counter}-gw-${(nodeId || 'unk').slice(0, 16).replace(/[^A-Za-z0-9_-]/g, '')}`;
    }

    // -----------------------------------------------------------------------
    // Internal: idempotency cache trim
    // -----------------------------------------------------------------------
    _cleanIdempotencyCache() {
        const expiry = 600_000; // 10 minutes
        const now = Date.now();
        for (const [id, t] of this.processedMessageIds.entries()) {
            if (now - t > expiry) this.processedMessageIds.delete(id);
        }
    }
}

// ---------------------------------------------------------------------------
// reply — shared helper that works for Express, the browser context, and
// the systemOrchestrator self-test path which passes no `res` at all.
// ---------------------------------------------------------------------------
function reply(res, status, body) {
    if (res && typeof res.status === 'function') {
        return res.status(status).json(body);
    }
    return body;
}
