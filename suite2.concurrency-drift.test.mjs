/**
 * suite2.concurrency-drift.test.mjs
 * CommonGround — Suite 2: Multi-Device Concurrency & Clock-Drift Verification
 *
 * This test suite validates local-first conflict resolution (HLC property-level LWW)
 * and network fault resilience under clock-drift and concurrent offline partition scenarios.
 *
 * RUN:   node --test suite2.concurrency-drift.test.mjs
 */

import { describe, it, before, after, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { LocalFirstSyncEngine } from './commonGroundSyncEngine.js';

// Mute console chatters during tests
const realLog = console.log;
const realWarn = console.warn;
before(() => { console.log = () => {}; console.warn = () => {}; });
after(() => { console.log = realLog; console.warn = realWarn; });

const tick = (ms = 15) => new Promise((r) => setTimeout(r, ms));

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

describe('Suite 2 — Sync Concurrency & Clock-Drift Core', () => {
  beforeEach(() => {
    globalThis.__coop_mock_ledger = [];
    globalThis.__active_sync_engines = [];
  });

  it('supports custom node IDs and custom clock offsets on independent engines', async () => {
    const baseTime = Date.now();
    
    const engineA = new LocalFirstSyncEngine('CG_Drift_A_' + Math.random().toString(36).slice(2));
    engineA.hlcClock.systemTimeProvider = () => baseTime + 5000; // fast clock (+5s)
    
    const engineB = new LocalFirstSyncEngine('CG_Drift_B_' + Math.random().toString(36).slice(2));
    engineB.hlcClock.systemTimeProvider = () => baseTime - 5000; // slow clock (-5s)

    const tsA = engineA.hlcClock.next();
    const tsB = engineB.hlcClock.next();

    const physA = parseInt(tsA.split('-')[0], 10);
    const physB = parseInt(tsB.split('-')[0], 10);

    assert.ok(physA >= baseTime + 5000, `Expected fast clock physical time to be >= baseTime + 5000, got ${physA}`);
    assert.ok(physB <= baseTime - 4900, `Expected slow clock physical time to be <= baseTime - 5000, got ${physB}`);
  });

  it('merges concurrent offline updates to different fields of the same record seamlessly (no sibling clobbering)', async () => {
    // Shared global simulated cloud outbox
    globalThis.__coop_mock_ledger = [];

    const baseTime = Date.now();
    const table = 'paddock_planner';
    const recordId = 'paddock-1';

    // 1. Initialize Mobile Node and Tablet Node
    const mobile = new LocalFirstSyncEngine('CG_Mobile_' + Math.random().toString(36).slice(2));
    const tablet = new LocalFirstSyncEngine('CG_Tablet_' + Math.random().toString(36).slice(2));
    
    // Simulate slight clock variations
    mobile.hlcClock.systemTimeProvider = () => Date.now() + 10;
    tablet.hlcClock.systemTimeProvider = () => Date.now() - 10;

    // Set offline
    mobile.isOnline = false;
    tablet.isOnline = false;

    // Write base record on both nodes
    const initialRecord = { id: recordId, name: 'North Field', current_status: 'RESTING', gateId: 'G1' };
    await mobile.saveRecordLocally(table, initialRecord);
    await tablet.saveRecordLocally(table, initialRecord);

    // Assert that initial local records are identical
    const recMob1 = await readRow(mobile, table, recordId);
    const recTab1 = await readRow(tablet, table, recordId);
    assert.strictEqual(recMob1.name, 'North Field');
    assert.strictEqual(recTab1.name, 'North Field');

    // Wait for physical time to advance past the clock drift offset (20ms)
    await tick(50);

    // 2. Perform concurrent edits offline
    // Mobile updates current_status -> GRAZING
    await mobile.saveRecordLocally(table, { id: recordId, current_status: 'GRAZING' });
    
    // Tablet updates name -> North Pasture Upgraded
    await tablet.saveRecordLocally(table, { id: recordId, name: 'North Pasture Upgraded' });

    // 3. Reconnect and sync both to simulated cloud cooperative mesh
    mobile.isOnline = true;
    tablet.isOnline = true;

    await mobile.flushLocalQueueToCloud();
    await tablet.flushLocalQueueToCloud();

    // Pull from cloud to propagate changes
    await mobile.pullAndReconcileMutations();
    await tablet.pullAndReconcileMutations();

    // 4. Assert both nodes converged on the merged sibling fields
    const convergedMobile = await readRow(mobile, table, recordId);
    const convergedTablet = await readRow(tablet, table, recordId);

    assert.strictEqual(convergedMobile.current_status, 'GRAZING');
    assert.strictEqual(convergedMobile.name, 'North Pasture Upgraded');
    assert.strictEqual(convergedMobile.gateId, 'G1'); // Original untouched field preserved

    assert.strictEqual(convergedTablet.current_status, 'GRAZING');
    assert.strictEqual(convergedTablet.name, 'North Pasture Upgraded');
    assert.strictEqual(convergedTablet.gateId, 'G1');

    assert.deepEqual(convergedMobile._timestamps, convergedTablet._timestamps, 'HLC Timestamps must match exactly across converged nodes');
  });

  it('guarantees convergence under extreme clock drifts (+1 hour vs -1 hour) on concurrent offline edits', async () => {
    globalThis.__coop_mock_ledger = [];

    const baseTime = Date.now();
    const table = 'paddock_planner';
    const recordId = 'paddock-2';

    // Fast Node (+1 hour) and Slow Node (-1 hour)
    const fastNode = new LocalFirstSyncEngine('CG_Fast_' + Math.random().toString(36).slice(2));
    const slowNode = new LocalFirstSyncEngine('CG_Slow_' + Math.random().toString(36).slice(2));

    fastNode.hlcClock.systemTimeProvider = () => Date.now() + 3600000;
    slowNode.hlcClock.systemTimeProvider = () => Date.now() - 3600000;

    fastNode.isOnline = false;
    slowNode.isOnline = false;

    // Base entry sowed
    const initialRecord = { id: recordId, name: 'Clover Field', current_status: 'RESTING' };
    await fastNode.saveRecordLocally(table, initialRecord);
    await slowNode.saveRecordLocally(table, initialRecord);

    // Concurrent offline edits to the exact same field
    await fastNode.saveRecordLocally(table, { id: recordId, current_status: 'GRAZING' }); // Written by fast clock
    await slowNode.saveRecordLocally(table, { id: recordId, current_status: 'MOWED' });   // Written by slow clock

    // Sync up to mesh
    fastNode.isOnline = true;
    slowNode.isOnline = true;

    await fastNode.flushLocalQueueToCloud();
    await slowNode.flushLocalQueueToCloud();

    // Pull modifications
    await fastNode.pullAndReconcileMutations();
    await slowNode.pullAndReconcileMutations();

    // Both nodes must successfully converge to the same value
    const finalFast = await readRow(fastNode, table, recordId);
    const finalSlow = await readRow(slowNode, table, recordId);

    assert.strictEqual(finalFast.current_status, finalSlow.current_status, 'Devices must converge despite extreme physical clock drifts');
    // Because fastNode clock is drifted +1 hr, its write at now+1hr has a higher HLC than slowNode's now-1hr, hence winning LWW resolution
    assert.strictEqual(finalFast.current_status, 'GRAZING', 'HLC logical vector stamps must resolve correctly based on physical-logical ordering');
  });

  it('outbox robustness: retains unsynced local mutations when network or database requests fail', async () => {
    const engine = new LocalFirstSyncEngine('CG_Network_Fail_' + Math.random().toString(36).slice(2));
    
    // Configure a real-looking Supabase URL to bypass the offline simulator check
    engine.supabaseUrl = 'https://live-test-project.supabase.co';
    engine.isOnline = true;

    // Inject a stub client that simulates a database auth or RLS error
    engine.supabase = {
      from: (table) => ({
        upsert: async (payload, options) => {
          return { error: { message: 'Database RLS error: insufficient privilege', code: '42501' } };
        }
      })
    };

    // Save record locally (queues mutations in outbox)
    await engine.saveRecordLocally('paddock_planner', { id: 'p2', current_status: 'RESTING' });

    // Flush to cloud (should fail due to injected mock error)
    await engine.flushLocalQueueToCloud();

    // Verify mutations remain unsynced in IndexedDB outbox
    const db = await engine.openLocalIndexedDB();
    const unsynced = await engine.getUnsyncedRecords(db);
    
    assert.ok(unsynced.length > 0, 'Unsynced outbox mutations must NOT be marked synced when a network or database error is returned.');
    assert.strictEqual(unsynced[0].synced, false);
  });
});
