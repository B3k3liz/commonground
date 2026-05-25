/**
 * suite1.persistence-sync.test.mjs
 * CommonGround — Suite 1: Local Storage Persistence & Sync.
 *
 * A real, assertion-based regression suite. It replaces the assertion-free
 * runSystemDiagnostics() routine that reported "100% HEALTHY" while data was
 * being silently destroyed.
 *
 * RUN:   node --test suite1.persistence-sync.test.mjs
 *        (Node 18+. Zero dependencies — built-in node:test + node:assert only,
 *         matching the project's no-build / no-library constraint.)
 *
 * HOW TO READ THE RESULTS
 *   - Untagged tests pin behaviour that currently WORKS. They must stay green;
 *     a red one is a regression.
 *   - Tests tagged [BUG <id>] encode the CORRECT behaviour, so they FAIL against
 *     today's code — on purpose. Each maps to a finding in
 *     CommonGround_Suite1_Verification_Audit.md and stays RED until that finding
 *     is fixed. When a [BUG] test goes green, the bug is fixed: drop the tag,
 *     keep the test. Do NOT weaken these assertions to force a pass.
 *
 * EXPECTED ON CURRENT CODE:  4 passing, 7 failing — all 7 failures intentional.
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalFirstSyncEngine } from './commonGroundSyncEngine.js';

/* ------------------------------------------------------------------------- */
/* harness                                                                   */
/* ------------------------------------------------------------------------- */

// Mute the engine's own console chatter so the test report stays readable.
// node:test reports through its own reporter, so results are unaffected.
const realLog = console.log;
const realWarn = console.warn;
before(() => { /* console.log = () => {}; console.warn = () => {}; */ });
after(() => { /* console.log = realLog; console.warn = realWarn; */ });

const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

/**
 * A fresh engine with its own isolated in-memory DB.
 * isOnline = false disables the unawaited auto-flush inside saveRecordLocally,
 * which would otherwise make outbox assertions non-deterministic.
 */
function freshEngine() {
  const e = new LocalFirstSyncEngine('CG_Test_' + Math.random().toString(36).slice(2));
  e.isOnline = false;
  return e;
}

async function readRow(engine, table, id) {
  const db = await engine.openLocalIndexedDB();
  return new Promise((resolve) => {
    const req = db.transaction(table, 'readonly').objectStore(table).get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => resolve(undefined);
  });
}

async function unsyncedMutations(engine) {
  const db = await engine.openLocalIndexedDB();
  return engine.getUnsyncedRecords(db);
}

/* ------------------------------------------------------------------------- */
/* Suite 1A — non-volatile storage persistence                               */
/* ------------------------------------------------------------------------- */

describe('Suite 1A — non-volatile storage persistence', () => {

  it('constructs without throwing when navigator is unavailable', () => {
    assert.doesNotThrow(() => freshEngine());
  });

  it('[BUG 1A-3] a GRANTED persistence result is recorded observably on the engine', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, storage: { persist: async () => true } },
      configurable: true
    });
    try {
      const engine = new LocalFirstSyncEngine('CG_PersistGrant');
      await tick();
      // navigator.storage.persist() resolved true. The engine must record the
      // outcome so the rest of the app can trust durability. Today the boolean
      // is logged inside a fire-and-forget .then() and then discarded.
      assert.strictEqual(engine.storagePersisted, true,
        '1A-3: persistence was granted but the result is not stored on the engine.');
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true });
    }
  });

  it('[BUG 1A-2] a DENIED persistence result is surfaced, not just console.warn-ed', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true, storage: { persist: async () => false } },
      configurable: true
    });
    try {
      const engine = new LocalFirstSyncEngine('CG_PersistDeny');
      await tick();
      // persist() returned false: the browser MAY evict land-yield data under
      // storage pressure. The engine must expose this so the app can react
      // (export/backup prompt, visible warning) rather than only log a warning.
      assert.strictEqual(engine.storagePersisted, false,
        '1A-2: persistence was denied but the engine exposes no observable signal.');
    } finally {
      Object.defineProperty(globalThis, 'navigator', { value: undefined, configurable: true });
    }
  });
});

/* ------------------------------------------------------------------------- */
/* Suite 1B — local persistence primitives (these currently WORK)            */
/* ------------------------------------------------------------------------- */

describe('Suite 1B — local persistence primitives', () => {

  it('saveRecordLocally writes a row that can be read back', async () => {
    const engine = freshEngine();
    await engine.saveRecordLocally('paddock_planner',
      { id: 'p1', name: 'North Paddock', current_status: 'GRAZING' });
    const row = await readRow(engine, 'paddock_planner', 'p1');
    assert.equal(row.name, 'North Paddock');
    assert.equal(row.current_status, 'GRAZING');
  });

  it('saveRecordLocally queues one outbox mutation per data field', async () => {
    const engine = freshEngine();
    await engine.saveRecordLocally('paddock_planner',
      { id: 'p1', name: 'North', current_status: 'GRAZING' }); // 2 mutable fields
    const muts = await unsyncedMutations(engine);
    assert.equal(muts.length, 2, 'expected one mutation each for name + current_status');
  });

  it('markAsSynced clears a mutation from the unsynced set', async () => {
    const engine = freshEngine();
    await engine.saveRecordLocally('paddock_planner', { id: 'p1', name: 'North' });
    let muts = await unsyncedMutations(engine);
    assert.ok(muts.length > 0);
    for (const m of muts) await engine.markAsSynced(m.table, m.id);
    muts = await unsyncedMutations(engine);
    assert.equal(muts.length, 0);
  });
});

/* ------------------------------------------------------------------------- */
/* Suite 1B — sync defects & data loss (these FAIL by design)                */
/* ------------------------------------------------------------------------- */

describe('Suite 1B — sync defects (red until fixed)', () => {
  beforeEach(() => {
    globalThis.__coop_mock_ledger = [];
    globalThis.__active_sync_engines = [];
  });

  it('[BUG 1B-2] a partial update must not clobber sibling fields', async () => {
    const engine = freshEngine();
    await engine.saveRecordLocally('paddock_planner', {
      id: 'p1', name: 'North Paddock', gateId: 'Node-G02', current_status: 'GRAZING',
    });
    // A later update touches only current_status — name + gateId must survive.
    await engine.saveRecordLocally('paddock_planner', { id: 'p1', current_status: 'RESTING' });
    const row = await readRow(engine, 'paddock_planner', 'p1');

    assert.equal(row.current_status, 'RESTING', 'the intended field should update');
    assert.equal(row.name, 'North Paddock',
      '1B-2: saveRecordLocally replaced the whole row — "name" was destroyed.');
    assert.equal(row.gateId, 'Node-G02',
      '1B-2: "gateId" was destroyed by the partial update — the gate->paddock link is lost.');
  });

  it('[BUG 1B-1] the sync engine must expose a pull / merge path', () => {
    const engine = freshEngine();
    assert.equal(typeof engine.pullFromCloud, 'function',
      '1B-1: engine is push-only (no pullFromCloud / applyRemoteMutations) — devices cannot converge.');
  });

  it('[BUG 1B-1] two devices editing the same record must converge', async () => {
    const deviceM = freshEngine(); // "Mobile"
    const deviceT = freshEngine(); // "Tablet"
    await deviceM.saveRecordLocally('paddock_planner', { id: 'p1', current_status: 'GRAZING' });
    await deviceT.saveRecordLocally('paddock_planner', { id: 'p1', current_status: 'RESTING' });
    // Both devices "sync to the cooperative cloud"...
    await deviceM.flushLocalQueueToCloud();
    await deviceT.flushLocalQueueToCloud();
    
    // Wait for the asynchronous in-memory peer sync replications to finish
    await tick(50);
    
    const rowM = await readRow(deviceM, 'paddock_planner', 'p1');
    const rowT = await readRow(deviceT, 'paddock_planner', 'p1');
    assert.equal(rowM.current_status, rowT.current_status,
      '1B-1: devices diverge permanently (GRAZING vs RESTING) — no pull, no merge, no consensus.');
  });

  it('[BUG 1B-3] each outbox mutation must carry a unique, ordered clock value', async () => {
    const engine = freshEngine();
    await engine.saveRecordLocally('paddock_planner',
      { id: 'p1', name: 'North', gateId: 'G02', current_status: 'GRAZING' }); // 3 fields
    const stamps = (await unsyncedMutations(engine)).map((m) => m.timestamp);
    assert.equal(new Set(stamps).size, stamps.length,
      '1B-3: every mutation in one save shares a single Date.now() value — a real HLC must be unique and ordered.');
  });

  it('[BUG 1B-4] a flush that only reached the offline simulator must not mark data synced', async () => {
    const engine = freshEngine(); // Node context: no real Supabase -> no-op stub client
    await engine.saveRecordLocally('paddock_planner', { id: 'p1', name: 'North' });
    await engine.flushLocalQueueToCloud(); // hits the stub, which returns { error: null }
    const muts = await unsyncedMutations(engine);
    assert.ok(muts.length > 0,
      '1B-4: the no-op simulator faked success and mutations were marked synced — they will never retry against a real cloud.');
  });
});
