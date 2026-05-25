# CommonGround — Phase 2 P2P Sync & Agro-Ecology Audit

**Scope:** P2P sync engine, edge telemetry, agro-ecology models, multi-tenant schema/RLS
**Date:** 2026-05-25
**Method:** full source review of the seven target files + live execution — both test suites run under Node 22, the schema verified against the live Supabase project (`omtjnkjqjkfwhaxbyfvb`) and a Postgres 16 harness.
**Files reviewed:** `commonGroundSyncEngine.js`, `systemOrchestrator.js`, `telemetryIngestor.js`, `climateCalculators.js`, `suite1.persistence-sync.test.mjs`, `suite2.concurrency-drift.test.mjs`, `supabase/migrations/20260525120000_cooperative_ledger.sql`. The nitrogen model named in the brief is not in `climateCalculators.js` — it lives in `app.js` (`logLivestockYield`, lines 1841–1906) and is audited there.

> **Note on a moving target:** the workspace was being edited live during this audit. Findings are pinned to file + line as observed; re-confirm against current state before acting.

---

## 0. Executive Summary

CommonGround's Phase 2 architecture is ambitious and mostly well-shaped — the field-level outbox, the HLC clock, and the RLS tenancy model are the right primitives. But the review found **two findings that block trust in Phase 2 entirely** and four more that are exploitable or cause silent data loss.

The single most important fact: **neither regression suite currently executes.** `runSystemDiagnostics()` printing "100% HEALTHY" is, again, the assertion-free theatre that `suite1` was written to replace — and `suite1` itself is now broken. Phase 2 is, at this moment, **unverified by its own tests.**

| ID | Severity | Finding |
|----|----------|---------|
| INF-1 | **Critical** | `suite1` is truncated mid-statement — `SyntaxError`, will not parse |
| INF-2 | **Critical** | No `package.json` — Node loads the engine as CommonJS; both `.mjs` suites fail to import it |
| P2P-1 | **Critical** | HLC has no drift bound — one forward-skewed device permanently captures LWW precedence and silences the mesh |
| P2P-2 | **High** | Lost-update race: field merge reads and writes in separate IndexedDB transactions across an `await` |
| TEL-1 | **High** | HMAC verification is skipped when the signature is absent — unsigned forged telemetry is accepted |
| TEL-2 | **High** | Idempotency cache is written *before* HMAC checks — an unauthenticated caller can pre-seed a `messageId` to suppress real telemetry |
| INT-1 | **High** | Sync engine sends `coop_id = 0000…` when no JWT claim is present — RLS rejects every `sync_mutations` insert |
| P2P-3 | Medium | A malformed remote `hlc_timestamp` NaN-poisons the local clock irrecoverably |
| P2P-4 | Medium | Outbox mutations and the row state are written in separate transactions — a crash leaves partial state |
| P2P-5 | Medium | One unknown `target_table` row aborts the entire pull for every device |
| TEL-3 | Medium | No HMAC freshness check — a captured packet replays after the 10-min idempotency window |
| TEL-4 | Medium | The 30-second debounce suppresses *all* ingestion (battery, close events), not just rotation |
| TEL-5 | Medium | `fetchActivePaddockByGate` falls back to paddock `'a'` and can rotate the wrong paddock |
| ECO-1 | Medium | Growth curve has no heat-stress descending limb — 105 °F reads as peak growth |
| ECO-2 | Medium | "Continuous" model contains step discontinuities (rainfall, humidity cliffs) — contradicts its own docstring |
| ECO-3 | Medium | The temperature term is an instantaneous coefficient, not accumulated Growing Degree Days |
| ECO-4 | Medium | Nitrogen mineralization is a flat 30-second timer, not a decay curve; no temperature dependence |
| RLS-1 | Medium | Ledger rows stay editable by their author forever, with no audit trail of the old value |
| RLS-2 | Medium | Multi-coop ambiguity — `current_coop_id()` silently picks the oldest membership |
| (various) | Low | Timing-unsafe HMAC compare; HLC counter width overflow; `÷0 → Infinity` capacity on bad input; hard-delete vs CRDT; in-memory caches lost on restart |

**What is solid (verified):** RLS is genuinely recursion-safe — the `SECURITY DEFINER` helpers break the `coop_members`-policy-calls-`coop_members` loop, confirmed live. The `suite1` bug-fix work (1B-2 sibling merge, 1B-3 unique HLC per field, 1B-4 retain-on-error, 1A-2/3 `storagePersisted`) is really implemented. HLC tie-breaking by `nodeId` gives a deterministic total order. `markAsSynced` correctly does its get+put in a single transaction.

---

## 1. Critical Code Audits

### 1.1 Test & Build Infrastructure

**INF-1 — `suite1` is truncated. [Critical]**
`suite1.persistence-sync.test.mjs` ends at line 202 mid-statement:
```js
await engine.flushLocalQueueToCloud(); // h
```
The `it(...)` callback, the `describe` block, and the file are unterminated → `SyntaxError: Unexpected end of input`. The baseline persistence suite cannot run. The documented "4 passing / 7 failing" is currently unachievable — the real result is a parse failure.

**INF-2 — No `package.json`; the engine loads as CommonJS. [Critical]**
There is no `package.json` in the project root. Node therefore classifies `.js` files as **CommonJS**. `suite2` (an ESM `.mjs`) fails at line 13:
```
SyntaxError: Named export 'LocalFirstSyncEngine' not found.
The requested module './commonGroundSyncEngine.js' is a CommonJS module…
```
`commonGroundSyncEngine.js` uses `export class` and top-level `await` — ESM syntax — but Node won't treat it as ESM without `"type": "module"`. So the **Concurrency & Drift suite — the headline Phase 2 deliverable — does not execute at all**, and `suite1` would hit the same wall even once un-truncated. In the browser it works only because `index.html` uses `<script type="module">`; Node has no such signal. Fix in §3.1.

### 1.2 P2P Logical Clock, Outbox & IndexedDB

**P2P-1 — Unbounded forward drift permanently captures precedence. [Critical]**
`commonGroundSyncEngine.js` — `HybridLogicalClock.receive()` (lines 101–122) and `next()` (90–99).

`receive()` does `maxPhysical = Math.max(now, this.physicalTime, remotePhysical)` with **no upper bound on `remotePhysical`**. There is no max-drift clamp anywhere. Consequence:

A device whose real-time clock is wrong — a tablet with a dead CMOS battery, a solar ESP32 gateway that reset to a default future epoch, a phone set to 2099 — emits a mutation stamped with that future physical time. The instant *any* peer calls `receive()` on that stamp, the peer's own `physicalTime` jumps to 2099. From then on every honest, correctly-clocked write (stamped ~2026) loses the LWW comparison in `pullAndReconcileMutations()` (line 537) — `Merge LOSE … Discarding remote value`. **One bad clock silently and permanently freezes the entire co-op mesh** on the drifted node's values; correct devices can never win again.

This is not hypothetical for a homestead: if the drifted node last wrote `current_status: 'GRAZING'`, a paddock can be stuck open and over-grazed while every other device's `'RESTING'` correction is discarded. `suite2`'s test 3 ("extreme clock drifts +1 hour vs −1 hour") **enshrines this as expected behaviour** — it asserts the +1-hour node wins *because* its clock is wrong. A genuine drift test should assert that drift is *contained*, not rewarded. Fix in §3.2.

**P2P-2 — Lost-update race in the field merge. [High]**
`saveRecordLocally()` (242–308) and `pullAndReconcileMutations()` (470–568) both follow: open a read transaction → `await` → compute → open a *separate* write transaction → `put()` the whole record object. IndexedDB auto-commits each transaction, so the read and the write are two atomic units with an `await` gap between them.

The engine invokes these concurrently: `saveRecordLocally` fires `flushLocalQueueToCloud()` un-awaited (line 305); `flushLocalQueueToCloud` fires other engines' `pullAndReconcileMutations()` un-awaited (455–461); `handleNetworkChange` runs flush then pull. Interleave two flows on the same record:

1. Flow X reads `{name:A, status:B}`
2. Flow Y reads `{name:A, status:B}`
3. X writes `{name:A', status:B}`
4. Y writes `{name:A, status:B'}` — **clobbers X; `name` reverts to A**

Because the *entire* record (including its `_timestamps` map) is `put()` wholesale, a flow that read a stale snapshot overwrites concurrently-merged sibling fields. The property-level `_timestamps` design does not save you — the row-level `put()` is the unit of loss. This is exactly the class of silent data loss `suite1` exists to catch, and no test exercises it. Fix in §3.3.

**P2P-3 — NaN-poisoning via a malformed timestamp. [Medium]**
`receive()` does `parseInt(parts[0], 10)` with no `isNaN` guard (it only checks `parts.length < 3`). A malformed `hlc_timestamp` makes `remotePhysical = NaN`, so `Math.max(now, physicalTime, NaN) = NaN` — `physicalTime` becomes `NaN` permanently. Every subsequent `next()` evaluates `now > NaN` as false, so the clock is frozen and emits `"NaN-0001-node"` forever. `sync_mutations.hlc_timestamp` is an unconstrained `text` column, so one buggy client write poisons every device that pulls it.

**P2P-4 — Partial-write across transactions. [Medium]**
`saveRecordLocally` writes each field's outbox mutation in its own transaction (281–287) and the record row in yet another (294–300). A tab close or crash mid-loop leaves the outbox and the row state inconsistent — outbox entries with no row update, or a row updated with missing outbox entries (those field changes then never sync). The outbox and the row it describes should be one atomic unit.

**P2P-5 — One bad row aborts the whole pull. [Medium]**
`pullAndReconcileMutations` does `db.transaction(rem.table_name, …)` (522). `target_table` is unconstrained `text`; a value not among the four IndexedDB stores throws `NotFoundError`, caught by the outer `try/catch` (565) which abandons the *entire* reconcile. One malformed `sync_mutations` row stops sync for every device. Validate `target_table` against an allow-list and `continue` past unknowns.

**INT-1 — `coop_id` mismatch rejects every cloud mutation. [High]**
`flushLocalQueueToCloud` resolves the tenant as `user.app_metadata.coop_id || user.user_metadata.coop_id || localStorage.getItem('cg_coop_id')` (407) and falls back to the all-zero UUID `00000000-…-000000000000` (437) when none is found. But the JWT custom-access-token hook is not yet enabled, nothing writes `user_metadata.coop_id`, and nothing sets `localStorage['cg_coop_id']`. So `coop_id` is the zero UUID — and the `sync_insert` RLS policy requires `coop_id = app.current_coop_id()`. Every `sync_mutations` insert is rejected (`42501`), the mutation stays unsynced, and it retries forever. Against the live backend the engine's cloud sync **fails 100%, silently.** This is the core Task-2 integration gap. (The engine now correctly targets the `sync_mutations` table — the earlier `cooperative_ledger_mutations` name mismatch is resolved.)

**Low-severity (P2P):** the HLC counter is `padStart(4)` — a frozen clock increments it past `9999`, widening the stamp string (numeric `compare()` still holds, any lexical sort breaks). The simulator's `__coop_mock_ledger` accumulates duplicates because the mock path never marks mutations synced — harmless for tests, but `pullAndReconcileMutations` reprocesses the whole list every pull.

### 1.3 Edge Telemetry — HMAC & Idempotency

**TEL-1 — HMAC is optional; unsigned requests are accepted. [High]**
`telemetryIngestor.js` line 86: `if (crypto && signature) { …verify… }`. If the request carries **no** signature, the block is skipped and the request proceeds *as authenticated*. An attacker simply omits the signature and their forged `gateId/status` payload is ingested — and an `OPEN` status drives `processAutomatedHerdRotation()`, a physical action. The HMAC is currently a courtesy, not a control. (Same bypass in any context where `crypto` failed to load.)

**TEL-2 — Idempotency cache poisoned before authentication. [High]**
The idempotency filter (64–82) records `messageId` into `processedMessageIds` *before* the HMAC check (84–103). `systemOrchestrator` mints message IDs as `msg-${Date.now()}` — predictable. An unauthenticated attacker who pre-sends a packet with the `messageId` a real gate is about to use causes the genuine, correctly-signed packet to be discarded as a `DUPLICATE_FILTERED`. That is a targeted **denial-of-service on real telemetry**. Authenticate first, then dedupe (§3.4).

**TEL-3 — No replay freshness. [Medium]**
The HMAC signs the body but nothing checks that the signed `timestamp` is recent. Inside the 10-minute idempotency window a replay is caught; *after* it expires, the identical captured-and-signed packet replays successfully and re-triggers a herd rotation. Reject packets whose `timestamp` is older than a few minutes.

**TEL-4 — Debounce suppresses all ingestion. [Medium]**
The 30-second cooldown (105–120) returns `GATE_BOUNCE_DEBOUNCED` for **every** status, not just rotation-triggering ones. After an `OPEN` sets the cooldown, a following `CLOSED` packet — and its battery-voltage reading — is dropped from `hardware_telemetry` entirely. The debounce should gate the *rotation action*, not telemetry *logging*.

**TEL-5 — Wrong-paddock resolution. [Medium]**
`fetchActivePaddockByGate` (357–383) matches `p => p.gateId === gateId || p.id === 'a'`. Because `Array.find` returns the first element satisfying the predicate, paddock `'a'` matches on `p.id === 'a'` *before* a later paddock that actually owns the gate is considered. Any gate whose paddock isn't `'a'` rotates paddock `'a'` instead. Match `gateId` first; only fall back to a default if nothing matched.

**Canonical JSON / cross-language risk.** `canonicalJsonStringify` (17–29) is correct and deterministic *within* V8 — `JSON.stringify` of numbers is spec-defined, so "V8 serialized variance" is not the real exposure. The real fragility is that the **ESP32 firmware must produce byte-identical canonical JSON in C++** — float formatting (`3.8` vs `3.80`), integer vs float, key ordering, and UTF-8 escaping must match exactly. The HMAC is only as canonical as the weakest of the two implementations. Treat the canonicalization spec as a shared cross-language contract with its own conformance test vectors. `undefined`-valued fields also stringify to the literal `undefined` here while a normal JSON encoder omits them — another mismatch surface.

**Low-severity (telemetry):** signature comparison is a plain `!==` — use `crypto.timingSafeEqual`. `processedMessageIds` / `lastRotationTimes` are in-memory `Map`s — a telemetry-server restart wipes both, re-admitting duplicates and allowing an immediate re-rotation.

### 1.4 Agro-Ecology Mathematical Models

**ECO-1 — No heat-stress limb. [Medium]**
`climateCalculators.js` (42–45): `growthCoefficient = min(1, (T − 40)/(70 − 40))`, else 0. The curve ramps 40→70 °F then **clamps flat at 1.0 with no descending side**. At 105 °F it still reports peak growth. Cool-season pasture (the 40 °F base implies cool-season grass) goes dormant in summer heat. The model would tell a homesteader their heat-dormant, drought-stressed pasture is at full carrying capacity — an over-grazing hazard. A correct response peaks at `tOpt` and falls to zero at a `tMax` (~95 °F). Fix in §3.5.

**ECO-2 — "Continuous" model has step discontinuities. [Medium]**
The file's docstring claims "continuous biological formulas instead of step-discontinuities," but the moisture term is a cliff: `if (historicalRainfallMm < 15) moistureModifier -= 0.25` (49–51). 14.9 mm → 0.75; 15.0 mm → 1.0 — a 0.1 mm input swings carrying capacity 25%. The `currentHumidity > 85` bonus (52–54) is the same. The code contradicts its own stated design principle. Replace both with smooth ramps (§3.5).

**ECO-3 — Not actually Growing Degree Days. [Medium]**
GDD is an *accumulated* heat unit — the sum of `(T_avg − T_base)` over the growth period. `calculateDynamicAUD` takes a single instantaneous `activeTemperature` and derives a point-in-time multiplier. It is a thermal-growth coefficient, not GDD; the carrying-capacity estimate swings with the current thermometer reading rather than the season's accumulated warmth. Either accumulate true GDD over the paddock's rest period, or rename the concept honestly.

**ECO-4 — Nitrogen mineralization is a timer, not a curve. [Medium]**
`app.js` `logLivestockYield` (1841–1906). Manure N is split into 15% immediate + 85% delayed, the delayed portion released in one lump after `Date.now() + 30000` — a flat 30-second wall-clock countdown (1891). Real organic-N mineralization is a first-order decay over **weeks to months**, strongly temperature-dependent (Q10 ≈ 2) and moisture-dependent. The model has: no decay curve (one discrete release), no temperature term, and it ignores the app's own simulated calendar (`this.currentDate`) in favour of real-world seconds. The 35% volatilization constant is defensible as a simplification; the "150% manure-N conversion" coefficient for dairy (1871) is >1 and not physically grounded. The brief's "slow composting decay curve" does not exist — it is a countdown.

**Low-severity (eco):** `calculateDynamicAUD` divides available forage by `adjustedDailyIntakePerHead` (93); with `avgAnimalWeight = 0` the denominator is 0 → `adjustedAUD = Infinity`. No input validation on weight or headcount. Cow DMI (`0.12 × BW^0.75` ≈ 21 lb/day for a 1000-lb cow) runs ~15–20% below NRC intake norms.

### 1.5 Database Schema & RLS

**Verified correct.** The multi-tenant RLS in `20260525120000_cooperative_ledger.sql` is **recursion-safe** — the helper functions (`app.current_coop_id`, `app.is_coop_member`, …) are `SECURITY DEFINER` with a locked `search_path`, so a policy on `coop_members` that calls them does not re-enter `coop_members` RLS. Confirmed live: a role-switched test created two cooperatives and proved tenant isolation, role gating, and a scoped `coop_member_balances` view with no recursion error. The security advisor is clean.

**RLS-1 — Ledger rows are mutable with no history. [Medium]**
`ledger_tx_update` lets a transaction's author edit `amount_cents`, `direction`, etc. of their own row indefinitely. For a *shared cooperative* ledger that is a governance weakness — a member can quietly rewrite a recorded amount; `updated_at` changes but the prior value is gone. Consider freezing rows after a short window, requiring corrections as new offsetting rows, or surfacing the field-level history that `sync_mutations` could capture.

**RLS-2 — Multi-coop ambiguity. [Medium]**
`coop_members`' uniqueness is `(coop_id, user_id)`, so a user *can* belong to several cooperatives, but `current_coop_id()`'s fallback does `order by created_at limit 1` — it silently picks the oldest. The model is implicitly "one user, one coop" without enforcing it. Either add `unique(user_id)`, or make the active coop an explicit, switchable selection.

**Low-severity (RLS):** `ledger_tx_delete` permits admin **hard** deletes, which contradicts the soft-delete (`deleted_at`) tombstone model CRDT convergence depends on — a hard-deleted row is resurrected by any peer that still holds its mutations. Also: the Supabase **performance** advisor was not run; per-row `app.is_coop_member(coop_id)` calls in `SELECT` policies should be checked for `auth_rls_initplan` re-evaluation at scale.

---

## 2. Deep-Dive Inquiries for Antigravity

**Q1 — Is wall-clock LWW the right conflict strategy for paddock state at all?**
P2P-1 shows physical-time LWW lets the most-broken clock dictate the mesh. A drift bound (§3.2) stops the *poisoning*, but it does not answer the deeper question: paddock status is a **state machine** (`GRAZING → RESTING → READY`), where an *illegal or stale* transition is worse than an *old* one. Should paddock state move off LWW onto a state-based CRDT or a causal-order log where a transition only applies if its causal predecessor is present — reserving LWW for genuinely commutative scalar fields (a name, a note)? What would we lose in simplicity, and is that trade worth it for a system that drives physical gates?

**Q2 — How do we harden a trust model where one static key drives physical actions?**
Every gate and every cooperative shares the single hardcoded `cg-secret-key-2026`. A telemetry packet can open a gate and rotate a herd. Should we move to per-device keys provisioned at pairing, with a monotonic per-device counter folded into the HMAC (killing replay structurally rather than via a freshness window), and a rotation path that does not require physically revisiting every solar node? And given LoRaWAN's own session-key layer — where should the application-layer HMAC stop and the link layer take over, so we are not paying for the same guarantee twice?

**Q3 — Two sync models now coexist — should they?**
`cloudLedger.js` syncs the financial ledger via direct row inserts into `ledger_transactions`; `commonGroundSyncEngine.js` syncs everything else via field-level mutations through `sync_mutations`. Two consistency models, two failure modes, one app. Should the ledger also flow through the CRDT outbox — gaining offline-merge and a built-in audit trail (addressing RLS-1) — or is direct-insert genuinely correct for append-mostly money records? If they stay split, how do we present two different "is this synced?" truths to one homesteader without confusing them?

---

## 3. Actionable Optimizations

### 3.1 Make the test suites runnable (INF-1, INF-2)

Create `package.json` in the project root:
```json
{
  "name": "commonground",
  "version": "0.2.0",
  "private": true,
  "type": "module"
}
```
This makes Node treat the `.js` modules as ESM, so both `.mjs` suites can import `LocalFirstSyncEngine`. Then **complete the truncated final test in `suite1`** — it currently dead-ends at `await engine.flushLocalQueueToCloud(); // h`; restore the closing assertions and the `})` / `});` terminators. Re-run `node --test suite1*.mjs suite2*.mjs` and confirm the documented 4-pass/7-fail baseline before trusting any Phase 2 result.

### 3.2 Bound HLC clock drift (P2P-1, P2P-3)

```js
// HybridLogicalClock — reject timestamps from implausibly-future clocks.
const MAX_DRIFT_MS = 60_000; // tolerate 60s of skew

receive(remoteTimestampStr) {
  if (!remoteTimestampStr) return;
  const parts = remoteTimestampStr.split('-');
  if (parts.length < 3) return;
  const remotePhysical = parseInt(parts[0], 10);
  const remoteCounter  = parseInt(parts[1], 10);
  if (!Number.isFinite(remotePhysical) || !Number.isFinite(remoteCounter)) return; // P2P-3

  const now = this.systemTimeProvider();
  if (remotePhysical - now > MAX_DRIFT_MS) {                                       // P2P-1
    console.warn(`[HLC] Rejecting stamp ${remoteTimestampStr}: +${remotePhysical - now}ms drift`);
    return; // do NOT absorb a wildly-future peer clock
  }
  // …existing max/counter logic…
}
```
Discuss in Q1 whether `next()` should additionally clamp `physicalTime` to `now + MAX_DRIFT_MS` so a *local* bad clock cannot run away either. Recovery for an already-poisoned mesh needs a separate one-time re-baselining pass.

### 3.3 Atomic read-modify-write on IndexedDB (P2P-2, P2P-4)

Do the get and the put inside **one** `readwrite` transaction, with a *synchronous* merge function and no `await` of foreign promises between them. IndexedDB serialises overlapping `readwrite` transactions on the same store, so this is atomic:
```js
function mergeRecordAtomic(db, table, recordId, applyFn) {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(table, 'readwrite');
    const store = tx.objectStore(table);
    const getReq = store.get(recordId);
    getReq.onsuccess = () => {
      const current = getReq.result || { id: recordId, _timestamps: {} };
      const updated = applyFn(current);   // pure, synchronous
      if (updated) store.put(updated);
    };
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
    tx.onabort    = () => reject(tx.error);
  });
}
```
Route both `pullAndReconcileMutations` and `saveRecordLocally` through this. For P2P-4, also write the outbox mutation(s) and the row in the **same** transaction (open `db.transaction([table, 'mutation_outbox'], 'readwrite')` once and use both stores).

### 3.4 Authenticate before you dedupe, and require signatures (TEL-1, TEL-2, TEL-3)

Reorder `handleGateStateWebhook`: **HMAC + freshness first, idempotency second.**
```js
// 1. Require and verify the signature BEFORE touching any cache.
if (!signature) return reply(401, 'Missing signature');
if (!crypto)    return reply(503, 'Crypto unavailable — cannot verify');

const verifyBody = { ...body }; delete verifyBody.signature;
const expected = crypto.createHmac('sha256', this.preSharedKey)
                       .update(canonicalJsonStringify(verifyBody)).digest('hex');
const a = Buffer.from(signature, 'hex'), b = Buffer.from(expected, 'hex');
if (a.length !== b.length || !crypto.timingSafeEqual(a, b))   // constant-time
  return reply(401, 'Invalid signature');

// 2. Freshness — kill replay structurally (TEL-3).
const ts = Date.parse(timestamp);
if (!ts || Math.abs(Date.now() - ts) > 5 * 60_000)
  return reply(401, 'Stale or missing timestamp');

// 3. NOW the idempotency cache — only authenticated IDs may enter it.
// …existing processedMessageIds logic…
```

### 3.5 Continuous agro-ecology curves (ECO-1, ECO-2)

A triangular thermal response — continuous, peaks at `tOpt`, zero at both ends:
```js
const tBase = 40, tOpt = 70, tMax = 95;   // tMax: cool-season heat shutdown
let growthCoefficient = 0;
if (activeTemperature > tBase && activeTemperature < tMax) {
  growthCoefficient = activeTemperature <= tOpt
    ? (activeTemperature - tBase) / (tOpt  - tBase)   // ascending limb
    : (tMax - activeTemperature)  / (tMax  - tOpt);   // descending limb (ECO-1)
}
```
Smooth moisture response in place of the cliffs (ECO-2):
```js
// Drought penalty ramps smoothly: full vigour ≥25mm, down to 0.75 at ≤5mm
const wet = Math.max(0, Math.min(1, (historicalRainfallMm - 5) / (25 - 5)));
let moistureModifier = 0.75 + 0.25 * wet;
// Dew bonus tapers in across 80–95% humidity, capped at +0.05
const dew = Math.max(0, Math.min(1, (currentHumidity - 80) / (95 - 80)));
moistureModifier = Math.min(1.05, moistureModifier + 0.05 * dew);
```
For ECO-4, replace the 30-second lump release with a first-order decay evaluated against the simulated calendar: `released(t) = totalDelayedN · (1 − e^(−k·Δdays))`, with `k` scaled by temperature (`k = k₀ · 2^((T−20)/10)`).

### 3.6 Close the cloud-sync integration gap (INT-1)

`flushLocalQueueToCloud` must obtain a real `coop_id`. Until the JWT custom-access-token hook is enabled, have `cloudLedger.js` persist the resolved cooperative id to `localStorage['cg_coop_id']` after `resolveCoop()`, and have the sync engine read it. Then either enable the hook (so `app_metadata.coop_id` is authoritative) or query `app.current_coop_id()` once at session start. Without this, every `sync_mutations` insert is RLS-rejected.

---

## Appendix — Verification Log

- `node --test suite1.persistence-sync.test.mjs` → `SyntaxError: Unexpected end of input` @ line 202 (INF-1).
- `node --test suite2.concurrency-drift.test.mjs` → `SyntaxError: Named export 'LocalFirstSyncEngine' not found … CommonJS module` (INF-2).
- `ls package.json` → not found (INF-2 root cause).
- Live schema (`omtjnkjqjkfwhaxbyfvb`): 5 RLS tables, 17 policies, security advisor clean; role-switched isolation test passed — RLS recursion safety confirmed.
- Node 22.22.0.
