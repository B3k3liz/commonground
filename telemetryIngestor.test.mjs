/**
 * telemetryIngestor.test.mjs
 * CommonGround — TelemetryAgent (edge webhook) security & behaviour tests.
 *
 * handleGateStateWebhook is the network entry point for field hardware and was
 * previously untested. It gates on HMAC-SHA256 signatures, timestamp freshness,
 * idempotency and a per-gate debounce window. These tests pin that behaviour so
 * a regression cannot silently accept a forged or replayed packet.
 *
 * RUN:  node --test telemetryIngestor.test.mjs
 */

import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { TelemetryAgent, canonicalJsonStringify } from './telemetryIngestor.js';

const PRE_SHARED_KEY = 'cg-secret-key-2026';

/** Minimal fake sync engine — records writes, resolves a paddock per gate. */
function fakeSyncEngine(paddock = null) {
  const saved = [];
  return {
    saved,
    async saveRecordLocally(table, data) { saved.push({ table, data }); return data; },
    async fetchActivePaddockByGate() { return paddock; },
  };
}

/** Build a request whose signature is correct for its body (unless overridden). */
function signedRequest(bodyOverrides = {}, { withSignature = true, headers = {} } = {}) {
  const body = {
    gateId: 'Node-G02',
    status: 'OPEN_TEMPORARY',
    timestamp: new Date().toISOString(),
    batteryVoltage: 3.82,
    messageId: 'msg-' + Math.random().toString(36).slice(2),
    ...bodyOverrides,
  };
  const reqHeaders = { 'x-idempotency-key': body.messageId, ...headers };
  if (withSignature) {
    const verifyBody = { ...body };
    delete verifyBody.signature;
    reqHeaders['x-commonground-signature'] = crypto
      .createHmac('sha256', PRE_SHARED_KEY)
      .update(canonicalJsonStringify(verifyBody))
      .digest('hex');
  }
  return { headers: reqHeaders, body };
}

/* ------------------------------------------------------------------------- */
/* canonicalJsonStringify — the signing primitive                            */
/* ------------------------------------------------------------------------- */

describe('canonicalJsonStringify', () => {
  it('orders object keys so logically-equal objects hash identically', () => {
    assert.equal(
      canonicalJsonStringify({ b: 1, a: 2 }),
      canonicalJsonStringify({ a: 2, b: 1 })
    );
    assert.equal(canonicalJsonStringify({ b: 1, a: 2 }), '{"a":2,"b":1}');
  });

  it('recurses into nested objects and arrays', () => {
    assert.equal(
      canonicalJsonStringify({ z: { y: 1, x: 2 }, a: [3, { d: 4, c: 5 }] }),
      '{"a":[3,{"c":5,"d":4}],"z":{"x":2,"y":1}}'
    );
  });

  it('preserves array order (arrays are ordered, objects are not)', () => {
    assert.equal(canonicalJsonStringify([3, 1, 2]), '[3,1,2]');
  });

  it('handles null and primitives', () => {
    assert.equal(canonicalJsonStringify(null), 'null');
    assert.equal(canonicalJsonStringify(42), '42');
    assert.equal(canonicalJsonStringify('x'), '"x"');
  });
});

/* ------------------------------------------------------------------------- */
/* Construction                                                              */
/* ------------------------------------------------------------------------- */

describe('TelemetryAgent — construction', () => {
  it('requires a sync engine', () => {
    assert.throws(() => new TelemetryAgent(), /requires a configured/);
  });
});

/* ------------------------------------------------------------------------- */
/* Input validation & freshness                                              */
/* ------------------------------------------------------------------------- */

describe('handleGateStateWebhook — validation & freshness', () => {
  let agent;
  beforeEach(() => { agent = new TelemetryAgent(fakeSyncEngine()); });

  it('rejects a body missing gateId or status', async () => {
    const res = await agent.handleGateStateWebhook({ headers: {}, body: { status: 'OPEN' } });
    assert.match(res.error, /Missing gateId or status/);
  });

  it('rejects a stale timestamp (older than the 5-minute window)', async () => {
    const req = signedRequest({ timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString() });
    const res = await agent.handleGateStateWebhook(req);
    assert.match(res.error, /Timestamp expired/);
  });

  it('rejects a missing timestamp', async () => {
    const req = signedRequest({ timestamp: undefined });
    const res = await agent.handleGateStateWebhook(req);
    assert.match(res.error, /Timestamp expired/);
  });
});

/* ------------------------------------------------------------------------- */
/* HMAC signature enforcement (TEL-1)                                        */
/* ------------------------------------------------------------------------- */

describe('handleGateStateWebhook — HMAC signature enforcement', () => {
  let agent;
  beforeEach(() => { agent = new TelemetryAgent(fakeSyncEngine()); });

  it('rejects a packet with no signature', async () => {
    const req = signedRequest({}, { withSignature: false });
    const res = await agent.handleGateStateWebhook(req);
    assert.match(res.error, /Missing signature/);
  });

  it('rejects a tampered body whose signature no longer matches', async () => {
    const req = signedRequest();
    req.body.status = 'OPEN'; // mutate after signing
    const res = await agent.handleGateStateWebhook(req);
    assert.match(res.error, /Invalid signature/);
  });

  it('rejects a malformed (non-hex / wrong-length) signature without throwing', async () => {
    const req = signedRequest({}, { withSignature: false, headers: { 'x-commonground-signature': 'not-a-real-signature' } });
    const res = await agent.handleGateStateWebhook(req);
    assert.match(res.error, /Invalid signature/);
  });

  it('accepts a correctly-signed, fresh packet and persists telemetry', async () => {
    const engine = fakeSyncEngine();
    agent = new TelemetryAgent(engine);
    const res = await agent.handleGateStateWebhook(signedRequest({ status: 'CLOSED' }));
    assert.equal(res.status, 'ACK');
    assert.equal(res.processed, true);
    assert.ok(engine.saved.some(s => s.table === 'hardware_telemetry'),
      'a hardware_telemetry row should be written');
  });
});

/* ------------------------------------------------------------------------- */
/* Idempotency (TEL replay protection)                                       */
/* ------------------------------------------------------------------------- */

describe('handleGateStateWebhook — idempotency', () => {
  it('filters a duplicate messageId as a replay (processed:false)', async () => {
    const agent = new TelemetryAgent(fakeSyncEngine());
    const req = signedRequest({ status: 'CLOSED' });
    const first = await agent.handleGateStateWebhook(req);
    assert.equal(first.processed, true);

    // Same idempotency key again — must be discarded, not re-applied.
    const second = await agent.handleGateStateWebhook(req);
    assert.equal(second.processed, false);
    assert.equal(second.event, 'DUPLICATE_FILTERED');
  });

  it('does not register idempotency for a packet that fails signature check', async () => {
    const agent = new TelemetryAgent(fakeSyncEngine());
    const bad = signedRequest({}, { withSignature: false });
    await agent.handleGateStateWebhook(bad); // rejected, must NOT be remembered

    // A later, correctly-signed packet reusing that same key must still process.
    const good = signedRequest({ status: 'CLOSED', messageId: bad.body.messageId },
      { headers: { 'x-idempotency-key': bad.body.messageId } });
    const res = await agent.handleGateStateWebhook(good);
    assert.equal(res.processed, true, 'signature failures must not poison the idempotency cache');
  });
});

/* ------------------------------------------------------------------------- */
/* Herd-rotation trigger & gate debounce                                     */
/* ------------------------------------------------------------------------- */

describe('handleGateStateWebhook — rotation & debounce', () => {
  it('triggers herd rotation and rests the linked paddock on an OPEN gate', async () => {
    const engine = fakeSyncEngine({ id: 'paddock-1', name: 'North' });
    const agent = new TelemetryAgent(engine);
    const res = await agent.handleGateStateWebhook(signedRequest({ status: 'OPEN' }));
    assert.equal(res.event, 'GATE_INGESTION_SUCCESS');
    const paddockWrite = engine.saved.find(s => s.table === 'paddock_planner');
    assert.ok(paddockWrite, 'an OPEN gate should write a paddock_planner update');
    assert.equal(paddockWrite.data.current_status, 'RESTING');
  });

  it('debounces a second OPEN on the same gate inside the cooldown window', async () => {
    const agent = new TelemetryAgent(fakeSyncEngine({ id: 'paddock-1', name: 'North' }));
    const first = await agent.handleGateStateWebhook(signedRequest({ status: 'OPEN' }));
    assert.equal(first.event, 'GATE_INGESTION_SUCCESS');

    const second = await agent.handleGateStateWebhook(signedRequest({ status: 'OPEN' }));
    assert.equal(second.processed, false);
    assert.equal(second.event, 'GATE_BOUNCE_DEBOUNCED');
  });

  it('does NOT trigger rotation for a CLOSED gate', async () => {
    const engine = fakeSyncEngine({ id: 'paddock-1', name: 'North' });
    const agent = new TelemetryAgent(engine);
    await agent.handleGateStateWebhook(signedRequest({ status: 'CLOSED' }));
    assert.ok(!engine.saved.some(s => s.table === 'paddock_planner'),
      'a CLOSED gate must not rest a paddock');
  });
});

/* ------------------------------------------------------------------------- */
/* cleanIdempotencyCache                                                     */
/* ------------------------------------------------------------------------- */

describe('cleanIdempotencyCache', () => {
  it('evicts entries older than the 10-minute expiry and keeps fresh ones', () => {
    const agent = new TelemetryAgent(fakeSyncEngine());
    agent.processedMessageIds.set('old', Date.now() - 11 * 60 * 1000);
    agent.processedMessageIds.set('fresh', Date.now());
    agent.cleanIdempotencyCache();
    assert.ok(!agent.processedMessageIds.has('old'), 'expired entry should be evicted');
    assert.ok(agent.processedMessageIds.has('fresh'), 'fresh entry should survive');
  });
});
