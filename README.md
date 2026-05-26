# CommonGround — Eco-Village & Homestead OS

Local-first, offline-resilient operations software for family homesteads,
eco-villages, and agricultural cooperatives. Built around three principles:

- **Sovereignty** — your co-op's data lives on your devices first; cloud sync
  is opt-in.
- **Resilience** — the full app runs without a network. Sync catches up when
  connectivity returns.
- **Compassion** — trauma-informed UI (low cognitive load, `prefers-reduced-motion`
  honoured, WCAG 2.2 AA contrast).

## Quick start

```bash
# 1. Run the app locally — pure static, no build step.
npx serve .         # or any other static server

# 2. Run the test suite.
npm test            # 62 tests across sync, telemetry, cottage food, state resources
```

That's it for local exploration. The app degrades gracefully without Supabase,
without ESP32 sensors, and without the offline voice model — features unlock
as the operator provisions them.

## Provisioning checklist

| Feature | Operator action |
|---|---|
| Cloud sync | None — `cloudLedger.js` is preconfigured for the demo Supabase project. To self-host, see [Sovereignty](#sovereignty-self-hosted-supabase). |
| **Offline voice (Vosk-WASM)** | Drop `vendor/vosk-browser/` + `models/vosk-model-small-en-us-0.15.tar.gz` into the repo root. See header of [voiceLogger.js](voiceLogger.js). |
| **ESP32 gate sensors** | Flash [firmware/esp32-gate-sensor/esp32-gate-sensor.ino](firmware/esp32-gate-sensor/esp32-gate-sensor.ino). Pair via serial: `set-node-id`, `set-secret`, `set-wifi`, `set-url`, `commit`. |
| **Edge gateway (Raspberry Pi)** | `sudo gateway/setup-pi.sh` — installs nginx + node + self-signed TLS + the telemetry ingestor. |

## Repository layout

```
CommonGround/
├── index.html               Single-page UI shell
├── app.js                   Main app class (~3700 lines; planned for split)
├── styles.css               Glassmorphic visual system
├── manifest.json            PWA manifest
├── sw.js                    Service worker (two-tier cache)
│
├── cloudLedger.js           Live Supabase sync (ledger transactions)
├── commonGroundSyncEngine.js  Property-level CRDT engine (HLC + IndexedDB)
├── systemOrchestrator.js    Wires sync engine + telemetry + climate together
├── telemetryIngestor.js     HMAC webhook receiver (browser + gateway)
├── climateCalculators.js    USDA zone GDD + multi-species DMI
├── voiceLogger.js           Vosk-WASM offline speech-to-text
├── vosk-resampler-worklet.js  48 kHz → 16 kHz AudioWorklet
├── cottageFoodValidator.js  50-state cottage-food rules engine
├── stateResources.js        USDA zones + Extension Service lookups
│
├── data/
│   ├── cottage-food-rules.json       50-state matrix (cottage food + raw milk)
│   └── state-extension-resources.json  50-state USDA zones + Coop Extension URLs
│
├── firmware/
│   └── esp32-gate-sensor/            Arduino C++ for the gate-swing sensor
│
├── gateway/
│   ├── server.js                     Express wrapper for the ingestor
│   ├── nginx/                        NGINX site configs
│   ├── setup-pi.sh                   Idempotent Pi installer
│   └── systemd/                      Service units
│
├── supabase/
│   └── migrations/                   Postgres DDL (additive on the canonical schema)
│
├── tests/
│   ├── test-p2p-concurrency.js       12 sync/HLC tests
│   ├── test-telemetry-ingestor.js    13 HMAC + ingestion tests
│   ├── test-cottage-food-validator.js 22 cottage-food tests
│   └── test-state-resources.js       15 state-resources tests
│
└── .github/workflows/test.yml        CI: npm test on push + PR
```

## Architecture in 60 seconds

```
                              ┌──────────────────────────┐
                              │   ESP32 gate sensor      │
                              │ HMAC-SHA256 / 5s hyst.   │
                              └────────────┬─────────────┘
                                           │ HTTPS (canonical JSON)
                                           ▼
                              ┌──────────────────────────┐
   per-device hmac_secret  ◄──┤  NGINX reverse proxy     │
   from hardware_nodes        │  (Raspberry Pi, TLS)     │
                              └────────────┬─────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │  telemetryIngestor.js    │
                              │  Express, /api/v1/...    │
                              └────────────┬─────────────┘
                                           │ service-role insert
                                           ▼
                              ┌──────────────────────────┐
              ┌──────────────►│  Supabase Postgres       │
              │               │  sync_mutations (CRDT)   │
              │               │  hardware_telemetry      │
              │               │  paddock_planner         │
              │               │  ledger_transactions     │
              │               └────────────┬─────────────┘
              │                            │ RLS: coop_id = current_coop_id()
              │                            ▼
              │               ┌──────────────────────────┐
              │               │  commonGroundSyncEngine  │
              │ HLC outbox    │  Browser IndexedDB       │
              └───────────────┤  + cloudLedger.js        │
                              └────────────┬─────────────┘
                                           │
                                           ▼
                              ┌──────────────────────────┐
                              │  app.js  (single-page)   │
                              │  cart, ledger, paddock,  │
                              │  voice, scanner, …       │
                              └──────────────────────────┘
                                  ▲                  ▲
                                  │                  │
                       voiceLogger.js      cottageFoodValidator.js
                       (Vosk-WASM)         + stateResources.js
```

## Sovereignty: self-hosted Supabase

The demo project (`omtjnkjqjkfwhaxbyfvb.supabase.co`) is configurable. To
self-host:

1. Run your own Supabase (or any Postgres + GoTrue + PostgREST).
2. Apply the migrations in [supabase/migrations/](supabase/migrations/) in
   timestamp order.
3. Set the URL + publishable key on your `index.html`:
   ```html
   <meta name="cg-supabase-url"  content="https://your-pg.example.coop">
   <meta name="cg-supabase-key"  content="sb_publishable_…">
   ```
   `cloudLedger.js` and the sync engine both read these meta tags before
   falling back to the demo defaults.

## Confidence + verification flags

Two of the larger datasets carry per-entry confidence:

- **`data/cottage-food-rules.json`** — `high` (statute reviewed), `medium`
  (summary cross-referenced), `low` (schema scaffold, needs counsel review).
  The validator fails closed on `low`-confidence states.
- **`data/state-extension-resources.json`** — URL freshness confidence.

Both carry `lastVerified` ISO dates. The settings panel surfaces "verified N
months ago" for the operator's awareness.

## License

MIT.
