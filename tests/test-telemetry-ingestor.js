/**
 * test-telemetry-ingestor.js — unit tests for the rewritten ingestor
 * ---------------------------------------------------------------------------
 * Verifies:
 *   * per-node secret resolution
 *   * canonical-JSON cross-language compatibility (round-trip with our own
 *     canonicalJsonStringify gives a verifying signature)
 *   * malformed/missing signature rejection
 *   * stale timestamp rejection
 *   * idempotency: same X-Idempotency-Key returns DUPLICATE_FILTERED
 *   * gate-bounce debounce: second OPEN within cooldown returns BOUNCE_DEBOUNCED
 *   * legacyDevKey opt-in still accepts the deprecated PSK
 * ---------------------------------------------------------------------------
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import {
    TelemetryAgent,
    canonicalJsonStringify
} from '../telemetryIngestor.js';
import { LocalFirstSyncEngine } from '../commonGroundSyncEngine.js';

// ---------------------------------------------------------------------------
// fixtures
// ---------------------------------------------------------------------------
const NODE_ID  = 'Node-G02';
const SECRET   = Buffer.from('4e2c1f8b9a3d2e7c5f6a1b3d4e5f6a7b' +
                             '4e2c1f8b9a3d2e7c5f6a1b3d4e5f6a7b', 'hex');

function makeAgent({ secretResolver, legacyDevKey, syncEngine } = {}) {
    return new TelemetryAgent({
        syncEngine: syncEngine || newSyncEngine(),
        secretResolver,
        legacyDevKey: !!legacyDevKey
    });
}
function newSyncEngine() {
    // Clean memory-DB engine; not tied to any other test's state.
    globalThis.__active_sync_engines = [];
    globalThis.__coop_mock_ledger    = [];
    return new LocalFirstSyncEngine('CG_Test_Ingestor_' + Math.random(), '', '');
}

function sign(secret, body) {
    return crypto.createHmac('sha256', secret)
        .update(canonicalJsonStringify(body)).digest('hex');
}
function nowIso() { return new Date().toISOString(); }

function fakeReq({ body, signature, idempotencyKey } = {}) {
    const headers = {};
    if (signature      !== undefined) headers['x-commonground-signature'] = signature;
    if (idempotencyKey !== undefined) headers['x-idempotency-key']        = idempotencyKey;
    return { headers, body };
}
function fakeRes() {
    const r = { _status: 0, _body: null };
    r.status = (s) => { r._status = s; return r; };
    r.json   = (b) => { r._body = b; return r; };
    return r;
}

// ---------------------------------------------------------------------------
beforeEach(() => {
    globalThis.__active_sync_engines = [];
    globalThis.__coop_mock_ledger    = [];
});

describe('canonical JSON', () => {
    test('keys are alphabetised regardless of insertion order', () => {
        const a = canonicalJsonStringify({ z: 1, a: 2, m: 3 });
        const b = canonicalJsonStringify({ a: 2, m: 3, z: 1 });
        assert.equal(a, b);
        assert.equal(a, '{"a":2,"m":3,"z":1}');
    });

    test('nested objects sort recursively', () => {
        const s = canonicalJsonStringify({ b: { y: 1, x: 2 }, a: 1 });
        assert.equal(s, '{"a":1,"b":{"x":2,"y":1}}');
    });

    test('matches the ESP32 firmware\'s expected body shape exactly', () => {
        // The firmware emits this exact byte stream via snprintf — keep
        // the order in step with what telemetryIngestor.js produces.
        const body = {
            batteryVoltage: 3.82,
            gateId:         'Node-G02',
            messageId:      'g-abcdef-7-3',
            status:         'OPEN',
            timestamp:      '2026-05-26T12:34:56Z'
        };
        assert.equal(
            canonicalJsonStringify(body),
            '{"batteryVoltage":3.82,' +
              '"gateId":"Node-G02",' +
              '"messageId":"g-abcdef-7-3",' +
              '"status":"OPEN",' +
              '"timestamp":"2026-05-26T12:34:56Z"}'
        );
    });
});

describe('TelemetryAgent: HMAC verification', () => {

    test('accepts a packet signed with the per-node secret', async () => {
        const resolver = async (id) => (id === NODE_ID ? SECRET : null);
        const agent = makeAgent({ secretResolver: resolver });

        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-accept-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(SECRET, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 200);
        assert.equal(res._body.event, 'GATE_INGESTION_SUCCESS');
    });

    test('rejects a packet with a wrong signature', async () => {
        const resolver = async () => SECRET;
        const agent = makeAgent({ secretResolver: resolver });

        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-wrong-1'
        };
        const wrongSig = sign(Buffer.from('different-secret'), body);
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: wrongSig, idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 401);
    });

    test('rejects a packet whose gateId has no registered secret', async () => {
        const resolver = async () => null;        // unknown node
        const agent = makeAgent({ secretResolver: resolver });

        const body = {
            gateId: 'Node-UNKNOWN', status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-unk-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(SECRET, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 401);
    });

    test('rejects a missing or malformed signature header', async () => {
        const agent = makeAgent({ secretResolver: async () => SECRET });

        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-nosig-1'
        };

        const noSig = fakeRes();
        await agent.handleGateStateWebhook(fakeReq({ body }), noSig);
        assert.equal(noSig._status, 401);

        const malformed = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: 'not-hex-and-not-64-chars' }),
            malformed
        );
        assert.equal(malformed._status, 401);
    });
});

describe('TelemetryAgent: timestamp freshness', () => {
    test('rejects a packet with a timestamp older than the window', async () => {
        const agent = makeAgent({ secretResolver: async () => SECRET });
        const stale = new Date(Date.now() - 11 * 60 * 1000).toISOString();
        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: stale, batteryVoltage: 3.82,
            messageId: 'msg-stale-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(SECRET, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 401);
    });
});

describe('TelemetryAgent: idempotency & gate-bounce debounce', () => {

    test('replaying the same X-Idempotency-Key returns DUPLICATE_FILTERED', async () => {
        const agent = makeAgent({ secretResolver: async () => SECRET });
        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-dedup-1'
        };
        const sig = sign(SECRET, body);

        const first = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sig, idempotencyKey: body.messageId }), first);
        assert.equal(first._status, 200);
        assert.equal(first._body.event, 'GATE_INGESTION_SUCCESS');

        const second = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sig, idempotencyKey: body.messageId }), second);
        assert.equal(second._status, 200);
        assert.equal(second._body.event, 'DUPLICATE_FILTERED');
    });

    test('second OPEN within the cooldown returns GATE_BOUNCE_DEBOUNCED', async () => {
        const agent = makeAgent({
            secretResolver: async () => SECRET,
            // shorten the cooldown so the test is fast
        });
        // Default cooldown is 30s — replace at runtime.
        agent.rotationCooldownMs = 30_000;

        const make = (id, status) => {
            const body = {
                gateId: NODE_ID, status,
                timestamp: nowIso(), batteryVoltage: 3.82,
                messageId: id
            };
            return { body, sig: sign(SECRET, body) };
        };

        const a = make('m-open-1', 'OPEN');
        const r1 = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body: a.body, signature: a.sig, idempotencyKey: a.body.messageId }), r1);
        assert.equal(r1._body.event, 'GATE_INGESTION_SUCCESS');

        const b = make('m-open-2', 'OPEN');
        const r2 = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body: b.body, signature: b.sig, idempotencyKey: b.body.messageId }), r2);
        assert.equal(r2._body.event, 'GATE_BOUNCE_DEBOUNCED');
    });

    test('CLOSED never triggers rotation regardless of cooldown', async () => {
        const agent = makeAgent({ secretResolver: async () => SECRET });
        const body = {
            gateId: NODE_ID, status: 'CLOSED',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-closed-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(SECRET, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._body.event, 'GATE_INGESTION_SUCCESS');
        // Subsequent CLOSED packets stay successful — they don't engage the
        // cooldown which is OPEN-only by design.
        const body2 = { ...body, messageId: 'msg-closed-2' };
        const res2 = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body: body2, signature: sign(SECRET, body2), idempotencyKey: body2.messageId }),
            res2
        );
        assert.equal(res2._body.event, 'GATE_INGESTION_SUCCESS');
    });
});

describe('TelemetryAgent: legacyDevKey opt-in', () => {

    test('accepts a packet signed with the deprecated PSK when legacyDevKey is on', async () => {
        const agent = makeAgent({ legacyDevKey: true });
        const legacySecret = Buffer.from('cg-secret-key-2026', 'utf8');
        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-legacy-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(legacySecret, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 200);
        assert.equal(res._body.event, 'GATE_INGESTION_SUCCESS');
    });

    test('rejects PSK-signed packets when legacyDevKey is OFF (production default)', async () => {
        const agent = makeAgent({ secretResolver: async () => SECRET });
        const legacySecret = Buffer.from('cg-secret-key-2026', 'utf8');
        const body = {
            gateId: NODE_ID, status: 'OPEN',
            timestamp: nowIso(), batteryVoltage: 3.82,
            messageId: 'msg-legacy-off-1'
        };
        const res = fakeRes();
        await agent.handleGateStateWebhook(
            fakeReq({ body, signature: sign(legacySecret, body), idempotencyKey: body.messageId }),
            res
        );
        assert.equal(res._status, 401);
    });
});
