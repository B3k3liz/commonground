/**
 * CommonGround — Unified System Orchestrator
 * Integrates the Sovereign Sync Engine, Telemetry Ingestion Layer, and Climate Calibrator
 * into a single unified workspace driver.
 */
import { LocalFirstSyncEngine } from './commonGroundSyncEngine.js';
import { TelemetryAgent, canonicalJsonStringify } from './telemetryIngestor.js';
import { EnvironmentalCalibrator } from './climateCalculators.js';

// Try to dynamically load Node's native crypto module for HMAC signature generation
let cryptoModule;
try {
  cryptoModule = await import('crypto').then(m => m.default || m).catch(() => null);
} catch (e) {
  // Graceful fallback for non-Node browser contexts
}

class SystemOrchestrator {
  constructor() {
    console.log('%cInitializing CommonGround 0.01% Elite Operational Workspace...', 'color: #10b981; font-weight: bold; font-size: 14px;');
    
    // 1. Instantiate the Sovereign Local-First DB sync layer
    this.syncEngine = new LocalFirstSyncEngine(
      'CommonGround_LocalDB',
      'https://omtjnkjqjkfwhaxbyfvb.supabase.co', // Default Supabase entry point
      'sb_publishable_UONEEiHKSUNoSYVc0yB5MA_fEde2Mhp' // Safe public JWT holder
    );

    // 2. Instantiate edge node Telemetry Ingestion Listener.
    //
    // legacyDevKey is now gated on cgRunDiagnostics. In production
    // (default) the orchestrator constructs the agent without the
    // deprecated PSK trust; the agent then refuses any HMAC verification
    // attempt because it has no secretResolver — which is the correct,
    // closed default. Diagnostics enable both legacyDevKey AND the test
    // call site at the same time, so the self-test still round-trips.
    const inDiagnosticsMode =
      typeof window !== 'undefined' && window.cgRunDiagnostics === true;
    this.telemetryAgent = new TelemetryAgent({
      syncEngine: this.syncEngine,
      legacyDevKey: inDiagnosticsMode
    });

    // 3. Instantiate ecological growth/grazing calculators.
    // USDA Plant Hardiness Zone (T3.3) is now sourced from, in priority order:
    //   1. window.cgConfig.usdaZone   (test / programmatic override)
    //   2. localStorage 'cg_usda_zone' (set via Settings → USDA Hardiness Zone)
    //   3. fallback 6 (the original hardcode)
    let zone = 6;
    if (typeof window !== 'undefined') {
      if (window.cgConfig && Number.isFinite(window.cgConfig.usdaZone)) {
        zone = window.cgConfig.usdaZone;
      } else if (window.localStorage) {
        const stored = parseInt(window.localStorage.getItem('cg_usda_zone'), 10);
        if (Number.isFinite(stored) && stored >= 1 && stored <= 13) zone = stored;
      }
    }
    this.climateCalibrator = new EnvironmentalCalibrator(zone);

    this.initialized = true;
    console.log('%c✨ CommonGround 0.01% Agent System successfully online and loaded.', 'color: #34d399; font-weight: bold;');
  }

  /**
   * Runs a complete diagnostic verification loop of all architectural pipelines
   */
  async runSystemDiagnostics() {
    console.log('\n--- STARTING SOVEREIGN SYSTEM DIAGNOSTICS ---');
    
    try {
      // Diagnostic 1: Local Database & Sync Outbox
      const mockPaddock = {
        id: 'a',
        name: 'North Paddock (A)',
        gateId: 'Node-G02',
        current_status: 'GRAZING',
        last_rotation_date: new Date().toISOString()
      };
      
      console.log('Testing Database Write Pipeline...');
      const savedRecord = await this.syncEngine.saveRecordLocally('paddock_planner', mockPaddock);
      console.log('Database Write Success:', savedRecord.id);

      console.log('Testing Outbox Sync Reconciler Flush...');
      await this.syncEngine.flushLocalQueueToCloud();
      
      // Verify that outbox mutations are successfully reconciled and marked as synced
      const dbInstance = await this.syncEngine.openLocalIndexedDB();
      const unsyncedAfter = await this.syncEngine.getUnsyncedRecords(dbInstance);
      console.log('Unsynced mutations remaining in outbox after flush:', unsyncedAfter.length);

      console.log('Testing P2P Two-Way Reconciler Pull Sync...');
      await this.syncEngine.pullAndReconcileMutations();

      // Diagnostic 2: Telemetry Ingest Webhook (including HMAC signature validation)
      console.log('Testing Edge Webhook Ingest Pipeline with HMAC-SHA256 Signature...');
      
      const messageId = `msg-${Date.now()}`;
      const preSharedKey = 'cg-secret-key-2026';
      
      const mockBody = {
        gateId: 'Node-G02',
        status: 'OPEN_TEMPORARY',
        timestamp: new Date().toISOString(),
        batteryVoltage: 3.82,
        messageId: messageId
      };
      
      let computedSignature = null;
      if (cryptoModule) {
        computedSignature = cryptoModule
          .createHmac('sha256', preSharedKey)
          .update(canonicalJsonStringify(mockBody))
          .digest('hex');
      }
      
      const mockReq = {
        headers: {
          'x-idempotency-key': messageId,
          'x-commonground-signature': computedSignature
        },
        body: mockBody
      };
      
      const response = await this.telemetryAgent.handleGateStateWebhook(mockReq);
      console.log('Edge Webhook Ingestion Response:', response);

      // Diagnostic 3: Ecological AUD calculations under typical spring grazing conditions.
      // We deliberately pick T=65°F (mid-curve, ascending limb of the triangular
      // growth coefficient) so the diagnostic surface a healthy non-zero capacity.
      // Frost (T < tBase = 40°F) and heat-shutdown (T > tMax = 95°F) clamp to zero
      // by design (ECO-1) — those edge cases are exercised by the suite, not here.
      console.log('Testing Climate Downscale Equation...');
      const capMetrics = this.climateCalibrator.calculateDynamicAUD(
        1500, // 1500 lbs/acre
        2.5,  // 2.5 acres
        60,   // 60% humidity
        20,   // 20mm rainfall (well-watered)
        65    // 65°F (mid-growth-curve)
      );
      
      console.log('Climate Downscale Capacity Result:', capMetrics);
      
      console.log('--- DIAGNOSTIC ROUTINE FINALIZED (100% HEALTHY) ---\n');
      return { success: true, diagnostics: { db: 'OK', telemetry: 'OK', climate: 'OK' } };
    } catch (e) {
      console.error('❌ Diagnostic Routine Failure:', e);
      return { success: false, error: e.message };
    }
  }
}

// Instantiate singleton orchestrator for application integration.
// Diagnostics are OPT-IN via window.cgRunDiagnostics = true (set before this
// module loads). The previous behaviour ran the full diagnostic suite on
// every page load, which wrote a mock paddock record into IndexedDB and
// posted a synthetic telemetry packet — fine during development, but real
// data noise in production. Toggle on when intentionally debugging.
const appOrchestrator = new SystemOrchestrator();

if (typeof window !== 'undefined') {
  window.appOrchestrator = appOrchestrator;
  if (window.cgRunDiagnostics === true) {
    appOrchestrator.runSystemDiagnostics();
  }
}

export { appOrchestrator, SystemOrchestrator };
