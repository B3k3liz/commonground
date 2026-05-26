/**
 * CommonGround — Telemetry Ingestion Layer (TelemetryAgent)
 * Production-grade HTTP/LoRa Webhook receiver for hardware metrics,
 * incorporating HMAC security, idempotency filters, and gate debounce trackers.
 */

// Try to dynamically load Node's native crypto module for HMAC validation
let crypto;
try {
  // Support standard Node and dynamic module contexts
  crypto = await import('crypto').then(m => m.default || m).catch(() => null);
} catch (e) {
  // Graceful fallback for non-Node browser contexts
}

// Canonical stringify to recursively sort object keys alphabetically
export function canonicalJsonStringify(obj) {
  if (obj === null || typeof obj !== 'object') {
    return JSON.stringify(obj);
  }
  if (Array.isArray(obj)) {
    return '[' + obj.map(canonicalJsonStringify).join(',') + ']';
  }
  const keys = Object.keys(obj).sort();
  const properties = keys.map(key => {
    return JSON.stringify(key) + ':' + canonicalJsonStringify(obj[key]);
  });
  return '{' + properties.join(',') + '}';
}

export class TelemetryAgent {
  constructor(syncEngine) {
    if (!syncEngine) {
      throw new Error("TelemetryAgent requires a configured LocalFirstSyncEngine instance.");
    }
    this.syncEngine = syncEngine;
    
    // F-04: Pre-shared key for hardware message authentication (HMAC-SHA256)
    this.preSharedKey = 'cg-secret-key-2026';
    
    // F-05: Caches to prevent duplicate packet retries (idempotency) and debounce gate swings
    this.processedMessageIds = new Map();
    this.lastRotationTimes = new Map();
  }

  /**
   * Express-ready Webhook Ingestion Hook for edge microcontrollers (ESP32 / LoRa RF)
   * POST /api/v1/telemetry/gate-state
   */
  async handleGateStateWebhook(req, res) {
    const headers = req.headers || {};
    const body = req.body || {};
    const { gateId, status, timestamp, batteryVoltage, messageId } = body;

    // 1. Validation check
    if (!gateId || !status) {
      const errResponse = { error: 'Validation failed: Missing gateId or status parameters.' };
      if (res && typeof res.status === 'function') {
        return res.status(400).json(errResponse);
      }
      return errResponse;
    }

    // 1B. Enforce timestamp freshness checks (5-minute window)
    const now = Date.now();
    const msgTime = timestamp ? new Date(timestamp).getTime() : null;
    if (!msgTime || Number.isNaN(msgTime) || Math.abs(now - msgTime) > 300000) {
      const freshResponse = { error: 'Unauthorized: Timestamp expired or missing.' };
      if (res && typeof res.status === 'function') {
        return res.status(401).json(freshResponse);
      }
      return freshResponse;
    }

    // 2. F-04: Cryptographic HMAC-SHA256 Signature Verification (TEL-1: Strict Signature Enforcement)
    const signature = headers['x-commonground-signature'] || body.signature;
    if (!signature) {
      const unauthorizedResponse = { error: 'Unauthorized: Missing signature verification failed.' };
      if (res && typeof res.status === 'function') {
        return res.status(401).json(unauthorizedResponse);
      }
      return unauthorizedResponse;
    }

    if (!crypto) {
      const serviceUnavailableResponse = { error: 'Service Unavailable: Crypto module not available.' };
      if (res && typeof res.status === 'function') {
        return res.status(503).json(serviceUnavailableResponse);
      }
      return serviceUnavailableResponse;
    }

    // Create clone of request body without the signature parameter for hashing
    const verifyBody = { ...body };
    delete verifyBody.signature;
    
    const expectedSignature = crypto
      .createHmac('sha256', this.preSharedKey)
      .update(canonicalJsonStringify(verifyBody))
      .digest('hex');

    let signaturesMatch = false;
    try {
      const bufA = Buffer.from(signature, 'hex');
      const bufB = Buffer.from(expectedSignature, 'hex');
      if (bufA.length === bufB.length) {
        signaturesMatch = crypto.timingSafeEqual(bufA, bufB);
      }
    } catch (e) {
      signaturesMatch = false;
    }

    if (!signaturesMatch) {
      const unauthorizedResponse = { error: 'Unauthorized: Invalid signature verification failed.' };
      if (res && typeof res.status === 'function') {
        return res.status(401).json(unauthorizedResponse);
      }
      return unauthorizedResponse;
    }

    // 3. F-05: Idempotency filter (Packet retransmission rejection)
    // Register idempotency AFTER signature and timestamp checks pass!
    const msgId = headers['x-idempotency-key'] || messageId;
    if (msgId) {
      if (this.processedMessageIds.has(msgId)) {
        const dupResponse = { 
          status: 'ACK', 
          processed: false, 
          event: 'DUPLICATE_FILTERED',
          description: 'Duplicate packet retry discarded successfully.' 
        };
        if (res && typeof res.status === 'function') {
          return res.status(200).json(dupResponse);
        }
        return dupResponse;
      }
      // Record message timestamp to allow cache expiry
      this.processedMessageIds.set(msgId, Date.now());
      this.cleanIdempotencyCache();
    }

    try {
      // 4. Log hardware telemetry state safely into local sovereign storage always
      await this.syncEngine.saveRecordLocally('hardware_telemetry', {
        node_id: gateId,
        state: status,
        voltage: batteryVoltage || 3.7,
        logged_at: timestamp || new Date().toISOString()
      });

      console.log(`%c[Telemetry Ingestion] Received authenticated packets from gate node "${gateId}" -> State: ${status}`, 'color: #38bdf8; font-weight: bold;');

      // 5. Execute automated herd rotation if gate swing is open and stable and not debounced
      if (status === 'OPEN_TEMPORARY' || status === 'OPEN') {
        const lastRotation = this.lastRotationTimes.get(gateId) || 0;
        const cooldownPeriod = 30000; // 30-second cooldown window for fast simulated tests (15 mins in production)
        
        if (Date.now() - lastRotation < cooldownPeriod) {
          console.warn(`[Telemetry Ingestion] Herd rotation for gate "${gateId}" is in cooldown.`);
          const debounceResponse = { 
            status: 'ACK', 
            processed: false, 
            event: 'GATE_BOUNCE_DEBOUNCED',
            description: 'Gate swing debounced. Herd rotation is currently in cooldown.'
          };
          if (res && typeof res.status === 'function') {
            return res.status(200).json(debounceResponse);
          }
          return debounceResponse;
        }

        this.lastRotationTimes.set(gateId, Date.now()); // Reset cooldown window
        await this.processAutomatedHerdRotation(gateId);
      }

      const successResponse = { status: 'ACK', processed: true, event: 'GATE_INGESTION_SUCCESS' };
      if (res && typeof res.status === 'function') {
        return res.status(200).json(successResponse);
      }
      return successResponse;
    } catch (err) {
      console.error(`[Telemetry Ingestion] Ingestion failure:`, err);
      const errorResponse = { error: 'Internal edge compilation failure.', details: err.message };
      if (res && typeof res.status === 'function') {
        return res.status(500).json(errorResponse);
      }
      return errorResponse;
    }
  }

  /**
   * Resolves the paddock linked to the telemetry event and logs active herd rotation state shifts
   */
  async processAutomatedHerdRotation(gateId) {
    console.log(`%c[Telemetry Ingestion] Physical gate swing detected! Triggering auto-rotation algorithms.`, 'color: #60a5fa;');
    
    // Locate the paddock configuration linked to this gate
    const targetPaddock = await this.syncEngine.fetchActivePaddockByGate(gateId);
    
    if (targetPaddock) {
      // Shift herd status and flag new rest duration requirements
      const updateData = {
        id: targetPaddock.id,
        name: targetPaddock.name || 'Paddock',
        current_status: 'RESTING',
        last_rotation_date: new Date().toISOString(),
        recovery_days_needed: 30 // Set baseline soil biological rest standard
      };

      await this.syncEngine.saveRecordLocally('paddock_planner', updateData);
      console.log(`%c[Telemetry Ingestion] Auto-grazing routine successfully fired. Paddock "${targetPaddock.id}" set to RESTING.`, 'color: #059669; font-weight: bold;');
      
      // Dispatch browser-level event if loaded inside UI client context so views live-update
      if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
        const event = new CustomEvent('cg-herd-rotated', { detail: updateData });
        window.dispatchEvent(event);
      }
    }
  }

  /**
   * Helper to clean up cache of expired message IDs (older than 10 minutes)
   */
  cleanIdempotencyCache() {
    const expirationLimit = 600000; // 10 minutes
    const now = Date.now();
    for (const [msgId, time] of this.processedMessageIds.entries()) {
      if (now - time > expirationLimit) {
        this.processedMessageIds.delete(msgId);
      }
    }
  }
}
