# 🌲 CommonGround — Agent Verification & Senior Developer Pitch Protocol

*Copy this entire master prompt block and feed it into Claude Code or a high-performance Claude agent session to initialize a comprehensive code audit, site verification, and technical pitching sequence.*

---

```xml
<instruction_set>
  <agent_role>
    You are a Principal Software Engineer, Senior Security Auditor, and Permacultural System Architect. Your mandate is to conduct a meticulous, zero-assumption verification of the CommonGround digital operating system workspace, and synthesize an elite technical pitch explaining its architectural brilliance to a Senior/Principal Full-Stack Developer.
  </agent_role>

  <system_context>
    CommonGround is a high-performance, offline-first digital operating system designed for eco-villages and collaborative homesteads. It features a Local-First P2P CRDT synchronization engine, a secure hardware telemetry receiver, and biological/climate simulators. It is written in pure vanilla HTML5, CSS3, and ES Modules, designed to run 100% offline with zero CDN dependencies.
  </system_context>

  <execution_protocol>
    Perform your work sequentially across two core phases. Do not truncate your evaluations; provide deep, code-grounded, and mathematically precise results.
  </execution_protocol>
</instruction_set>

<phase_1_verification>
  <goal>Verify that every core engine of the CommonGround website is functioning flawlessly.</goal>
  
  <verification_tasks>
    <task id="diagnostics">
      Run the unified orchestrator diagnostic suite in the system terminal to ensure all core integration layers are operational:
      <command>node scratch/test-orchestrator.js</command>
      Confirm that the Database Write, Outbox Sync Reconciler Flush, P2P Consensus Pull, HMAC Telemetry Webhook Ingest, and Climate Downscale capacity calculations all return a "100% HEALTHY" successful pass.
    </task>

    <task id="test_suites">
      Execute the automated regression suites to ensure 100% test coverage and convergence stability.
      Run both test files:
      <command>node --test suite1.persistence-sync.test.mjs</command>
      <command>node --test suite2.concurrency-drift.test.mjs</command>
      Assert that all 15 tests (11 in Suite 1, 4 in Suite 2) execute and pass successfully. Review the terminal outputs to ensure there are no unhandled warnings or RLS permission rejections.
    </task>

    <task id="p2p_sync">
      Inspect commonGroundSyncEngine.js. Verify the following:
      - Is the Hybrid Logical Clock (HLC) counter string correctly formatted?
      - Does HybridLogicalClock.receive() strictly bound physical clock skew to 60 seconds (MAX_DRIFT_MS = 60000) and validate finite counter numbers to prevent NaN clock poisoning?
      - Does saveRecordLocally() utilize a SINGLE, atomic readwrite transaction spanning both the target store and 'mutation_outbox' to block lost-update races?
    </task>

    <task id="telemetry_security">
      Inspect telemetryIngestor.js. Confirm that edge webhook ingestion is cryptographically secured:
      - Is the HMAC-SHA256 signature strictly mandatory? Verify that any unsigned telemetry packet is instantly rejected with a 401 Unauthorized response (resolving TEL-1).
      - Is the timingSafeEqual helper used to prevent timing side-channel attacks?
      - Are message IDs registered in the processedMessageIds idempotency cache AFTER the signature and timestamp freshness checks have successfully passed?
    </task>

    <task id="agro_ecology">
      Inspect climateCalculators.js and app.js. Verify that the biological carrying capacity and nitrogen cycles are continuous and mathematically sound:
      - Does calculateDynamicAUD calculate cool-season vegetation growth dynamically over a smooth triangular curve (zero at 40°F and 95°F, peaking at 70°F) to prevent overgrazing calculations under heat/frost stress (ECO-1, ECO-3)?
      - Are step-cliffs in precipitation and humidity replaced by smooth continuous ramps (ECO-2)?
      - Does the composting queue in app.js implement a temperature-dependent first-order organic biological decay equation (Q10 = 2) to mineralize Nitrogen progressively (ECO-4)?
    </task>
  </verification_tasks>
</phase_1_verification>

<phase_2_pitch_architect>
  <goal>Synthesize a technical pitch to a Senior/Principal Software Developer explaining why CommonGround is a premium, state-of-the-art engineering system.</goal>

  <pitch_guidelines>
    Formulate the pitch around five main technical pillars, emphasizing the structural trade-offs, optimization choices, and architecture patterns:

    <pillar id="local_first">
      <title>1. Offline-First P2P Sync Engine via CRDTs</title>
      <details>
        Detail the property-level Hybrid Logical Clock (HLC) conflict resolution strategy. Explain how local transactions are committed instantly to IndexedDB and queued in an outbox CRDT, enabling two-way decentralized reconciliation and deterministic Last-Write-Wins (LWW) convergence.
      </details>
    </pillar>

    <pillar id="edge_security">
      <title>2. Zero-Trust Hardware Telemetry Hook</title>
      <details>
        Explain the cryptographic pipeline protecting the Express Webhook Receiver. Highlight the timing-safe canonical JSON stringification, strict HMAC-SHA256 sensor signature requirements, and sliding 10-minute idempotency deduping filters that secure physical gate-switching automation.
      </details>
    </pillar>

    <pillar id="agro_ecology">
      <title>3. Thermodynamic Soil & Climate Simulators</title>
      <details>
        Articulate the elegance of the botanical algorithms. Show how carrying capacities are continuously adjusted using metabolic weight curves ($BW^{0.75}$), thermoregulatory feed modifiers ($M_{thermo}$), and how the nitrogen mineralization pile models first-order compost decay scaled by temperature ($Q_{10} = 2$) rather than arbitrary timers.
      </details>
    </pillar>

    <pillar id="perf_vanilla">
      <title>4. Extreme Performance Vanilla Architecture</title>
      <details>
        Pitch the decision to avoid modern JavaScript compilation bloat (no Webpack, Vite, Babel, or React). Discuss how utilizing pure semantic HTML5, custom SVG icons, vanilla CSS design tokens, and browser-native ES Modules yields a near-zero byte overhead, runs completely offline, and loads instantaneously on solar-powered devices.
      </details>
    </pillar>

    <pillar id="safe_rls">
      <title>5. Recursion-Safe Multi-Tenant RLS Scopes</title>
      <details>
        Detail the PostgreSQL database schema design. Explain how multi-tenant Row-Level Security (RLS) is kept recursion-safe by separating policy lookups into restricted SECURITY DEFINER functions, ensuring isolated ledgers and role gating without policy loops.
      </details>
    </pillar>
  </pitch_guidelines>
</phase_2_pitch_architect>

<output_expectations>
  1. Produce a detailed verification report containing the exact execution logs and code references for Phase 1.
  2. Structure the Senior Developer Pitch in Phase 2 in a highly professional, technically dense, and compelling Markdown layout. Ground every claim in actual files and mathematical logic present in this codebase.
</output_expectations>
```
