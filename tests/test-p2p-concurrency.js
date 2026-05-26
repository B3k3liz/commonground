/**
 * test-p2p-concurrency.js — P2P drift & reconciliation tests for CommonGround
 * ---------------------------------------------------------------------------
 * Exercises commonGroundSyncEngine.js under spec'd network partition and
 * clock-drift scenarios:
 *
 *   * Bekah's Phone   — physical clock drifted +5 min FAST
 *   * Barn Pi Server  — physical clock drifted -2 min SLOW
 *   * Field Tablet    — physical clock synced
 *
 * The tests bypass Supabase entirely and use the engine's built-in simulator
 * mesh (globalThis.__coop_mock_ledger + __active_sync_engines). That keeps
 * the suite hermetic and reproducible.
 *
 * Run from project root:
 *     node --test tests/test-p2p-concurrency.js
 * Or:
 *     npm run test:p2p
 *
 * Conventions:
 *   * "HLC stamp" / "HLC string" = canonical "<ms>-<counter4>-<nodeId>"
 *   * "Clover Field paddock height" is the spec's named drift target. We
 *     model it as paddock_planner record id='b', field='height_inches'.
 *
 * What we deliberately do NOT test here:
 *   * Supabase RPC roundtrips — those are integration tests, not unit.
 *   * IndexedDB persistence — Node has no indexedDB; the engine falls back
 *     to its MemoryDatabase, which is what we test against.
 * ---------------------------------------------------------------------------
 */
import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { HybridLogicalClock, LocalFirstSyncEngine }
    from '../commonGroundSyncEngine.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const PHONE  = { nodeId: 'phone-bek', offsetMs:  5 * 60 * 1000 };  //  +5 min
const PI     = { nodeId: 'barn-pi',   offsetMs: -2 * 60 * 1000 };  //  -2 min
const TABLET = { nodeId: 'tablet-fd', offsetMs:  0            };   //  synced

const CLOVER_FIELD_ID = 'b';

/**
 * Build a fresh engine with a deterministic node id and a forced clock skew.
 * The engine constructor reads navigator.onLine (undefined in Node, so it
 * defaults to true). We keep isOnline=true so saveRecordLocally fires the
 * simulator flush automatically — but we also manually call
 * flushLocalQueueToCloud/pullAndReconcileMutations where the test needs to
 * be explicit about ordering.
 */
function makeEngine(profile) {
    const e = new LocalFirstSyncEngine('CG_Test_' + profile.nodeId, '', '');
    // Pin the node id and clock state so the test is reproducible.
    e.hlcClock.nodeId        = profile.nodeId;
    e.hlcClock.physicalTime  = 0;
    e.hlcClock.counter       = 0;
    e.hlcClock.systemTimeProvider = () => Date.now() + profile.offsetMs;
    return e;
}

/**
 * Wipe the global simulator mesh between tests. Without this, engines from a
 * previous test would still be in __active_sync_engines and would receive
 * mutations from new tests, scrambling assertions.
 */
function resetSimulator() {
    globalThis.__active_sync_engines = [];
    globalThis.__coop_mock_ledger    = [];
}

/**
 * Pull the materialised record for a (table, recordId) pair from the
 * engine's in-memory store.
 */
function localRecord(engine, table, recordId) {
    return engine.memoryDb.data[table].get(recordId);
}

/**
 * Convenience for "make all three of these online and flush+pull until the
 * mesh is converged."
 */
async function settleMesh(engines) {
    // Flush every outbox to the shared mock ledger.
    for (const e of engines) {
        e.isOnline = true;
        await e.flushLocalQueueToCloud();
    }
    // Pull from the shared ledger back into each engine.
    for (const e of engines) {
        await e.pullAndReconcileMutations();
    }
    // Second pass — the first flush only seeded the ledger from each node's
    // perspective at write time; the second flush+pull cycle ensures every
    // engine sees every other engine's writes, regardless of order.
    for (const e of engines) {
        await e.pullAndReconcileMutations();
    }
}

beforeEach(() => resetSimulator());

// ===========================================================================
// HybridLogicalClock — primitive invariants
// ===========================================================================
describe('HybridLogicalClock primitives', () => {

    test('next() emits strictly monotonically increasing stamps', () => {
        const hlc = new HybridLogicalClock('node-x');
        const stamps = Array.from({ length: 50 }, () => hlc.next());

        for (let i = 1; i < stamps.length; i++) {
            assert.ok(
                HybridLogicalClock.compare(stamps[i], stamps[i - 1]) > 0,
                `stamps[${i}] ${stamps[i]} should be greater than stamps[${i - 1}] ${stamps[i - 1]}`
            );
        }
    });

    test('next() format matches <ms>-<counter4>-<nodeId>', () => {
        const hlc = new HybridLogicalClock('node-fmt-test');
        const stamp = hlc.next();
        assert.match(
            stamp,
            /^[0-9]{13,}-[0-9]{4,}-[A-Za-z0-9_-]{1,64}$/,
            `stamp "${stamp}" does not match canonical HLC format`
        );
        // Node id segment must be the literal one we configured.
        assert.ok(stamp.endsWith('-node-fmt-test'));
    });

    test('compare() ranks (physical, counter, nodeId) lexicographically', () => {
        // Same physical, different counters.
        assert.ok(HybridLogicalClock.compare('1700000000000-0002-x', '1700000000000-0001-x') > 0);
        // Different physical times override counter.
        assert.ok(HybridLogicalClock.compare('1700000000001-0000-x', '1700000000000-9999-x') > 0);
        // Same physical+counter, nodeId is the tiebreaker.
        assert.ok(HybridLogicalClock.compare('1700000000000-0001-zzzz', '1700000000000-0001-aaaa') > 0);
        // Reflexivity.
        assert.equal(HybridLogicalClock.compare('1700000000000-0001-x', '1700000000000-0001-x'), 0);
    });

    test('receive() bumps logical counter when remote shares physical time', () => {
        const hlc = new HybridLogicalClock('node-r');
        hlc.systemTimeProvider = () => 1_700_000_000_000;
        hlc.next();                              // (1.7e12, 0, r)
        const before = hlc.counter;
        // Remote stamp from same physical moment, counter ahead.
        hlc.receive('1700000000000-0005-other');
        assert.ok(hlc.counter > before, 'logical counter must advance');
    });

    test('receive() REJECTS remote stamps with >60s future drift (clock-poisoning defence)', () => {
        const hlc = new HybridLogicalClock('node-r');
        const realNow = 1_700_000_000_000;
        hlc.systemTimeProvider = () => realNow;
        hlc.next();                              // anchor local state
        const localBefore = `${hlc.physicalTime}-${hlc.counter}`;

        // Send a stamp 10 minutes in the future from local "now".
        const remoteFar = String(realNow + 10 * 60 * 1000) + '-0001-attacker';
        hlc.receive(remoteFar);

        // Internal HLC clock state must NOT jump to the future.
        const localAfter = `${hlc.physicalTime}-${hlc.counter}`;
        assert.equal(
            localAfter,
            localBefore,
            'receive() must not advance the local HLC into the attacker\'s future'
        );
    });

    test('receive() ignores NaN / malformed stamps without poisoning state', () => {
        const hlc = new HybridLogicalClock('node-r');
        hlc.systemTimeProvider = () => 1_700_000_000_000;
        hlc.next();
        const before = { physical: hlc.physicalTime, counter: hlc.counter };

        // Each of these must be a no-op.
        hlc.receive(undefined);
        hlc.receive('');
        hlc.receive('not-an-hlc');
        hlc.receive('NaN-NaN-evil');
        hlc.receive('1700000000000-NaN-evil');

        assert.equal(hlc.physicalTime, before.physical);
        assert.equal(hlc.counter, before.counter);
    });
});

// ===========================================================================
// Three-node P2P reconciliation under spec'd clock drift
// ===========================================================================
describe('Three-node P2P reconciliation under spec\'d clock drift', () => {

    test(
        'LWW: highest HLC wins on concurrent writes to Clover Field height ' +
        '(phone +5min beats pi -2min beats tablet synced)',
        async () => {
            const phone  = makeEngine(PHONE);
            const pi     = makeEngine(PI);
            const tablet = makeEngine(TABLET);

            // Simulate a network partition: all three write while offline so
            // none of them sees the others' edits until we explicitly settle.
            phone.isOnline = pi.isOnline = tablet.isOnline = false;

            // Concurrent writes to Clover Field height. The PHYSICAL ms used
            // by each node's HLC reflects its drift profile, so the phone
            // (+5min) will stamp the highest physical ms even if it wrote
            // chronologically first by wall-clock.
            await phone.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 12 });
            await pi.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 10 });
            await tablet.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 8  });

            // Sanity: pre-reconcile each engine still holds its own value.
            assert.equal(localRecord(phone,  'paddock_planner', CLOVER_FIELD_ID).height_inches, 12);
            assert.equal(localRecord(pi,     'paddock_planner', CLOVER_FIELD_ID).height_inches, 10);
            assert.equal(localRecord(tablet, 'paddock_planner', CLOVER_FIELD_ID).height_inches, 8);

            // Reconnect and converge.
            await settleMesh([phone, pi, tablet]);

            // All three nodes must now hold the phone's value (it stamped the
            // highest physical ms because of the +5min skew).
            for (const [name, engine] of [['phone', phone], ['pi', pi], ['tablet', tablet]]) {
                const r = localRecord(engine, 'paddock_planner', CLOVER_FIELD_ID);
                assert.equal(
                    r.height_inches, 12,
                    `${name} did not converge to phone's winning value (got ${r.height_inches})`
                );
            }

            // The winning HLC must be the phone's stamp. Each replica should
            // record it in its property-level _timestamps map.
            const phoneHlc = localRecord(phone, 'paddock_planner', CLOVER_FIELD_ID)
                ._timestamps.height_inches;
            for (const [name, engine] of [['pi', pi], ['tablet', tablet]]) {
                const remoteHlc = localRecord(engine, 'paddock_planner', CLOVER_FIELD_ID)
                    ._timestamps.height_inches;
                assert.equal(
                    remoteHlc, phoneHlc,
                    `${name}'s _timestamps.height_inches should equal phone's winning HLC`
                );
            }
        }
    );

    test(
        'property-level isolation: edits to different fields converge ' +
        'without one overwriting the other',
        async () => {
            const phone  = makeEngine(PHONE);
            const pi     = makeEngine(PI);
            const tablet = makeEngine(TABLET);

            phone.isOnline = pi.isOnline = tablet.isOnline = false;

            // Three different fields edited by three different devices —
            // no conflict possible if property-level merge works correctly.
            await phone.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 15 });
            await pi.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, capacity_au: 30 });
            await tablet.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, current_status: 'RESTING' });

            await settleMesh([phone, pi, tablet]);

            // Each replica should hold all three updates.
            for (const [name, engine] of [['phone', phone], ['pi', pi], ['tablet', tablet]]) {
                const r = localRecord(engine, 'paddock_planner', CLOVER_FIELD_ID);
                assert.equal(r.height_inches,   15,        `${name}.height_inches`);
                assert.equal(r.capacity_au,     30,        `${name}.capacity_au`);
                assert.equal(r.current_status,  'RESTING', `${name}.current_status`);
                // Each field has its own HLC stamp.
                assert.ok(r._timestamps.height_inches,  `${name}._timestamps.height_inches`);
                assert.ok(r._timestamps.capacity_au,    `${name}._timestamps.capacity_au`);
                assert.ok(r._timestamps.current_status, `${name}._timestamps.current_status`);
            }
        }
    );

    test(
        'idempotent re-pull: replaying the shared ledger leaves local state untouched',
        async () => {
            const phone  = makeEngine(PHONE);
            const pi     = makeEngine(PI);
            const tablet = makeEngine(TABLET);

            phone.isOnline = pi.isOnline = tablet.isOnline = false;

            await phone.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 9 });
            await settleMesh([phone, pi, tablet]);

            // Snapshot post-convergence state.
            const snap = engine => {
                const r = localRecord(engine, 'paddock_planner', CLOVER_FIELD_ID);
                return JSON.stringify({
                    height: r.height_inches,
                    ts: r._timestamps.height_inches
                });
            };
            const before = [snap(phone), snap(pi), snap(tablet)];

            // Replay the pull three more times. A loop or duplicate write
            // would show up as either a value change or a timestamp drift.
            for (let i = 0; i < 3; i++) {
                await phone.pullAndReconcileMutations();
                await pi.pullAndReconcileMutations();
                await tablet.pullAndReconcileMutations();
            }

            const after = [snap(phone), snap(pi), snap(tablet)];
            assert.deepEqual(after, before,
                'replaying pullAndReconcileMutations must be idempotent');
        }
    );

    test(
        'drift > tolerance: phone\'s +5min skew still WINS LWW but does NOT ' +
        'poison the receiver\'s local HLC clock',
        async () => {
            const phone = makeEngine(PHONE);
            const pi    = makeEngine(PI);

            phone.isOnline = pi.isOnline = false;

            // Anchor each node's HLC by performing a benign write so we can
            // capture the local physical-time component pre-merge.
            await pi.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 7 });
            const piPhysicalBefore = pi.hlcClock.physicalTime;

            await phone.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 11 });

            // Converge.
            await settleMesh([phone, pi]);

            // The merge must have applied the phone's value (it stamped the
            // higher physical ms — that's lexicographic LWW, drift or not).
            assert.equal(
                localRecord(pi, 'paddock_planner', CLOVER_FIELD_ID).height_inches,
                11,
                'phone\'s value should win the LWW merge despite drift'
            );

            // But pi's INTERNAL HLC clock physical time must NOT have jumped
            // forward by ~7 minutes. The engine's receive() guard rejects
            // future-drifted advances. (Internal physical time may have
            // advanced organically by a few ms during the test; we assert
            // strictly less than 60 seconds — the engine's MAX_DRIFT_MS.)
            const piPhysicalAfter = pi.hlcClock.physicalTime;
            const advancedBy = piPhysicalAfter - piPhysicalBefore;
            assert.ok(
                advancedBy < 60_000,
                `pi's HLC physical time advanced by ${advancedBy}ms — should be < 60000ms`
            );
        }
    );
});

// ===========================================================================
// Network partition and reconnect
// ===========================================================================
describe('Network partition and reconnect', () => {

    test(
        'an offline Pi queues outbox writes; reconnect flushes them and pulls ' +
        'newer remote writes so it converges with the rest of the mesh',
        async () => {
            const phone  = makeEngine(PHONE);
            const pi     = makeEngine(PI);
            const tablet = makeEngine(TABLET);

            // Pi goes offline AND we yank it from the active mesh so other
            // engines' flushes don't auto-propagate to it.
            pi.isOnline = false;
            globalThis.__active_sync_engines =
                globalThis.__active_sync_engines.filter(e => e !== pi);

            // While Pi is offline it does local work — moves the herd.
            await pi.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, current_status: 'GRAZING' });

            // Phone and tablet sync independently — phone's value wins because
            // it carries the +5min stamp.
            await phone.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 14 });
            await tablet.saveRecordLocally('paddock_planner',
                { id: CLOVER_FIELD_ID, height_inches: 6 });
            await settleMesh([phone, tablet]);

            // Reconnect Pi: rejoin the mesh and call handleNetworkChange,
            // which the engine's own listener does in the browser.
            globalThis.__active_sync_engines.push(pi);
            await pi.handleNetworkChange(true);
            // One extra reconcile pass so pi sees the post-flush ledger.
            await pi.pullAndReconcileMutations();

            const piRec = localRecord(pi, 'paddock_planner', CLOVER_FIELD_ID);
            // Pi keeps its own current_status edit (no other node touched it).
            assert.equal(piRec.current_status, 'GRAZING',
                'pi\'s offline-queued edit to current_status should survive');
            // Pi adopts phone's winning height (didn't have height before).
            assert.equal(piRec.height_inches, 14,
                'pi should adopt the winning remote height after reconnect');

            // And phone+tablet should now also see pi's contribution.
            await phone.pullAndReconcileMutations();
            await tablet.pullAndReconcileMutations();
            assert.equal(
                localRecord(phone,  'paddock_planner', CLOVER_FIELD_ID).current_status,
                'GRAZING'
            );
            assert.equal(
                localRecord(tablet, 'paddock_planner', CLOVER_FIELD_ID).current_status,
                'GRAZING'
            );
        }
    );

    test('replication of the same outbox mutation twice is a no-op (server-side idempotency surface)', async () => {
        // We can't exercise the server-side unique index without Supabase,
        // but we can exercise the engine's own dedup behaviour: pushing the
        // same simulator-ledger entry twice must not duplicate the local
        // record state on the receiver.
        const phone  = makeEngine(PHONE);
        const tablet = makeEngine(TABLET);

        phone.isOnline = tablet.isOnline = false;
        await phone.saveRecordLocally('paddock_planner',
            { id: CLOVER_FIELD_ID, height_inches: 13 });
        await settleMesh([phone, tablet]);

        const before = localRecord(tablet, 'paddock_planner', CLOVER_FIELD_ID);
        const beforeHlc = before._timestamps.height_inches;

        // Manually duplicate the mutation in the shared ledger and re-pull.
        const dup = { ...globalThis.__coop_mock_ledger[0] };
        globalThis.__coop_mock_ledger.push(dup);
        await tablet.pullAndReconcileMutations();

        const after = localRecord(tablet, 'paddock_planner', CLOVER_FIELD_ID);
        assert.equal(after.height_inches, before.height_inches);
        assert.equal(after._timestamps.height_inches, beforeHlc,
            'duplicate ledger entry must not alter the winning HLC stamp');
    });
});
