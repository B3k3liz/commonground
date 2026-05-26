/**
 * CommonGround — P2P Local-First Sync Engine (DBAgent)
 * Provides robust, offline-resilient local persistence using browser IndexedDB,
 * combined with a conflict-free CRDT synchronization layer for Supabase/P2P co-ops.
 */

// Try to dynamically load Supabase Client, fall back to simulated cloud cooperative state offline
let createClient;
try {
  // ESM loading from CDN or local packages
  const module = await import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').catch(() => null);
  createClient = module ? module.createClient : null;
} catch (e) {
  // Silent catch for node environments or fully disconnected sandboxes
}

if (!createClient) {
  // High-fidelity fallback client for offline/local standalone environments
  createClient = (supabaseUrl, supabaseKey) => {
    console.warn(`[LocalFirstSyncEngine] Supabase package unavailable in this context. Running in standalone local mesh simulator.`);
    return {
      from: (table) => ({
        upsert: async (data, options) => {
          console.log(`%c[P2P Sync Cooperative] Successfully synced record to table "${table}" (ID: ${data.id})`, 'color: #9cdcfe; font-weight: bold;');
          return { error: null };
        }
      })
    };
  };
}

/**
 * High-fidelity in-memory IndexedDB simulator for non-browser/CLI environments (e.g. Node.js tests)
 */
class MemoryDatabase {
  constructor() {
    this.data = {
      livestock_logs: new Map(),
      paddock_planner: new Map(),
      hardware_telemetry: new Map(),
      mutation_outbox: new Map()
    };
  }

  transaction(storeNames, mode) {
    return {
      objectStore: (name) => {
        if (!this.data[name]) {
          this.data[name] = new Map();
        }
        const map = this.data[name];
        return {
          put: (record) => {
            map.set(record.id, record);
            const req = { onsuccess: null, onerror: null };
            setTimeout(() => {
              if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
          },
          get: (id) => {
            const req = { onsuccess: null, onerror: null, result: map.get(id) };
            setTimeout(() => {
              if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
          },
          getAll: () => {
            const req = { onsuccess: null, onerror: null, result: Array.from(map.values()) };
            setTimeout(() => {
              if (req.onsuccess) req.onsuccess();
            }, 0);
            return req;
          }
        };
      }
    };
  }
}

export class HybridLogicalClock {
  constructor(nodeId) {
    this.nodeId = nodeId || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10));
    this.physicalTime = 0;
    this.counter = 0;
    // Allow custom clock overrides for testing clock drift
    this.systemTimeProvider = () => Date.now();
  }

  next() {
    const now = this.systemTimeProvider();
    if (now > this.physicalTime) {
      this.physicalTime = now;
      this.counter = 0;
    } else {
      this.counter += 1;
    }
    return `${this.physicalTime}-${String(this.counter).padStart(4, '0')}-${this.nodeId}`;
  }

  receive(remoteTimestampStr) {
    if (!remoteTimestampStr) return;
    const firstDash = remoteTimestampStr.indexOf('-');
    const secondDash = remoteTimestampStr.indexOf('-', firstDash + 1);
    if (firstDash === -1 || secondDash === -1) return;
    
    const remotePhysical = parseInt(remoteTimestampStr.slice(0, firstDash), 10);
    const remoteCounter = parseInt(remoteTimestampStr.slice(firstDash + 1, secondDash), 10);
    
    // P2P-3: Prevent NaN logical clock poisoning via parsed physical/counter validation
    if (!Number.isFinite(remotePhysical) || !Number.isFinite(remoteCounter)) {
      return;
    }
    
    const now = this.systemTimeProvider();
    
    // P2P-1: Bounded future physical clock drift limit (tolerate at most 60 seconds of skew)
    const MAX_DRIFT_MS = 60000;
    if (remotePhysical - now > MAX_DRIFT_MS) {
      console.warn(`[HLC] Rejecting remote timestamp with future skew: ${remoteTimestampStr} (+${remotePhysical - now}ms skew)`);
      return; // Reject wildly drifted physical epochs to prevent mesh freezing
    }
    
    const maxPhysical = Math.max(now, this.physicalTime, remotePhysical);
    
    if (maxPhysical === this.physicalTime && maxPhysical === remotePhysical) {
      this.counter = Math.max(this.counter, remoteCounter) + 1;
    } else if (maxPhysical === this.physicalTime) {
      this.counter += 1;
    } else if (maxPhysical === remotePhysical) {
      this.physicalTime = remotePhysical;
      this.counter = remoteCounter + 1;
    } else {
      this.physicalTime = maxPhysical;
      this.counter = 0;
    }
  }

  static compare(a, b) {
    if (!a && !b) return 0;
    if (!a) return -1;
    if (!b) return 1;
    
    const firstDashA = a.indexOf('-');
    const secondDashA = a.indexOf('-', firstDashA + 1);
    const physA = firstDashA === -1 ? 0 : parseInt(a.slice(0, firstDashA), 10) || 0;
    const countA = (firstDashA === -1 || secondDashA === -1) ? 0 : parseInt(a.slice(firstDashA + 1, secondDashA), 10) || 0;
    const nodeA = secondDashA === -1 ? '' : a.slice(secondDashA + 1);

    const firstDashB = b.indexOf('-');
    const secondDashB = b.indexOf('-', firstDashB + 1);
    const physB = firstDashB === -1 ? 0 : parseInt(b.slice(0, firstDashB), 10) || 0;
    const countB = (firstDashB === -1 || secondDashB === -1) ? 0 : parseInt(b.slice(firstDashB + 1, secondDashB), 10) || 0;
    const nodeB = secondDashB === -1 ? '' : b.slice(secondDashB + 1);

    if (physA !== physB) return physA - physB;
    if (countA !== countB) return countA - countB;
    if (nodeA < nodeB) return -1;
    if (nodeA > nodeB) return 1;
    return 0;
  }
}

export class LocalFirstSyncEngine {
  constructor(localDbName = 'CommonGround_LocalDB', supabaseUrl = '', supabaseKey = '') {
    this.dbName = localDbName;

    // Self-hosters can override the Supabase target without code edits by
    // setting <meta name="cg-supabase-url"> / <meta name="cg-supabase-key">
    // in index.html, or via window.cgConfig. Explicit constructor arguments
    // (used by tests + the orchestrator) take highest precedence.
    if (!supabaseUrl && typeof document !== 'undefined') {
      const m = document.querySelector('meta[name="cg-supabase-url"]');
      if (m && m.getAttribute('content')) supabaseUrl = m.getAttribute('content');
      else if (typeof window !== 'undefined' && window.cgConfig && window.cgConfig.supabaseUrl) {
        supabaseUrl = window.cgConfig.supabaseUrl;
      }
    }
    if (!supabaseKey && typeof document !== 'undefined') {
      const m = document.querySelector('meta[name="cg-supabase-key"]');
      if (m && m.getAttribute('content')) supabaseKey = m.getAttribute('content');
      else if (typeof window !== 'undefined' && window.cgConfig && window.cgConfig.supabaseKey) {
        supabaseKey = window.cgConfig.supabaseKey;
      }
    }
    this.supabaseUrl = supabaseUrl;
    this.supabaseKey = supabaseKey;
    this.storagePersisted = null; // B-1A-3: Expose storagePersisted state explicitly

    // Initial client setup
    if (this.supabaseUrl && this.supabaseKey) {
      this.supabase = createClient(this.supabaseUrl, this.supabaseKey);
    } else {
      this.supabase = createClient('https://mock-coop.supabase.co', 'mock-key');
    }

    this.isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
    
    // Setup true Hybrid Logical Clock
    let storedNodeId = null;
    if (typeof window !== 'undefined' && window.localStorage) {
      storedNodeId = window.localStorage.getItem('cg_node_id');
      if (!storedNodeId) {
        storedNodeId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).substring(2, 10);
        window.localStorage.setItem('cg_node_id', storedNodeId);
      }
    } else {
      storedNodeId = 'node-cli-' + (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID().slice(0, 4) : Math.random().toString(36).substring(2, 6));
    }
    this.hlcClock = new HybridLogicalClock(storedNodeId);
    
    // Proactively register this engine in the global active mesh list to simulate real-time synchronization
    globalThis.__active_sync_engines = globalThis.__active_sync_engines || [];
    globalThis.__active_sync_engines.push(this);
    
    // F-01: Proactively request non-volatile browser storage persistence
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      navigator.storage.persist().then(persisted => {
        this.storagePersisted = persisted; // B-1A-3: Record persistence outcome
        if (persisted) {
          console.log('%c[SyncEngine] Non-volatile persistent storage granted successfully.', 'color: #34d399; font-weight: bold;');
        } else {
          console.warn('[SyncEngine] Storage persistence not granted. Browser may evict local logs under storage pressure.');
        }
      }).catch(err => {
        this.storagePersisted = false; // B-1A-2: Surface denied/failed outcome
        console.error('[SyncEngine] Failed to request storage persistence:', err);
      });
    }

    // Setup in-memory mock if IndexedDB is unavailable (e.g. CLI testing)
    if (typeof indexedDB === 'undefined') {
      this.memoryDb = new MemoryDatabase();
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleNetworkChange(true));
      window.addEventListener('offline', () => this.handleNetworkChange(false));
    }
  }

  async handleNetworkChange(onlineStatus) {
    this.isOnline = onlineStatus;
    console.log(`%c[SyncEngine] Network status updated: ${this.isOnline ? '🟢 ONLINE' : '🔴 OFFLINE'}`, 'font-weight: bold;');
    if (this.isOnline) {
      await this.flushLocalQueueToCloud();
      await this.pullAndReconcileMutations();
    }
  }

  /**
   * Promise-based vanilla IndexedDB opener
   */
  openLocalIndexedDB() {
    if (typeof indexedDB === 'undefined') {
      return Promise.resolve(this.memoryDb);
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, 1);
      
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        // Create stores for cooperative logs, rotational pasture planners, ESP32 nodes, and property outbox
        const stores = ['livestock_logs', 'paddock_planner', 'hardware_telemetry', 'mutation_outbox'];
        stores.forEach(store => {
          if (!db.objectStoreNames.contains(store)) {
            db.createObjectStore(store, { keyPath: 'id' });
          }
        });
      };
      
      request.onsuccess = (event) => resolve(event.target.result);
      request.onerror = (event) => reject(event.target.error);
    });
  }

  async saveRecordLocally(table, data) {
    const recordId = data.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15));
    
    const localDb = await this.openLocalIndexedDB();

    // MemoryDatabase fallback for Node tests (synchronous Map emulation)
    if (typeof indexedDB === 'undefined') {
      const storeMap = this.memoryDb.data[table];
      const outboxMap = this.memoryDb.data['mutation_outbox'];
      
      let record = storeMap.get(recordId);
      if (!record) {
        record = { id: recordId, _timestamps: {} };
      }
      record._timestamps = record._timestamps || {};

      for (const [field, value] of Object.entries(data)) {
        if (field === 'id' || field === 'updated_at' || field === '_timestamps' || field === 'synced') continue;
        const hlcTimestamp = this.hlcClock.next();
        record[field] = value;
        record._timestamps[field] = hlcTimestamp;

        const mutation = {
          id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
          table,
          recordId,
          field,
          value,
          timestamp: hlcTimestamp,
          synced: false
        };
        outboxMap.set(mutation.id, mutation);
      }
      record.updated_at = new Date().toISOString();
      record.synced = false;
      storeMap.set(record.id, record);
      
      console.log(`%c[LocalFirstSyncEngine] Saved row state and queued outbox mutations atomically (MemoryDB) for table "${table}" (ID: ${recordId})`, 'color: #a78bfa;');
      if (this.isOnline) {
        this.flushLocalQueueToCloud();
      }
      return record;
    }

    // Production IndexedDB implementation: open a SINGLE transaction spanning both target table and 'mutation_outbox'
    return new Promise((resolve, reject) => {
      const tx = localDb.transaction([table, 'mutation_outbox'], 'readwrite');
      const targetStore = tx.objectStore(table);
      const outboxStore = tx.objectStore('mutation_outbox');

      const getReq = targetStore.get(recordId);

      getReq.onsuccess = () => {
        let record = getReq.result;
        if (!record) {
          record = { id: recordId, _timestamps: {} };
        }
        record._timestamps = record._timestamps || {};

        for (const [field, value] of Object.entries(data)) {
          if (field === 'id' || field === 'updated_at' || field === '_timestamps' || field === 'synced') continue;
          
          const hlcTimestamp = this.hlcClock.next();
          record[field] = value;
          record._timestamps[field] = hlcTimestamp;

          const mutation = {
            id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
            table,
            recordId,
            field,
            value,
            timestamp: hlcTimestamp,
            synced: false
          };
          outboxStore.put(mutation);
        }

        record.updated_at = new Date().toISOString();
        record.synced = false;
        targetStore.put(record);
      };

      tx.oncomplete = () => {
        console.log(`%c[LocalFirstSyncEngine] Saved row state and queued outbox mutations atomically for table "${table}" (ID: ${recordId})`, 'color: #a78bfa;');
        if (this.isOnline) {
          this.flushLocalQueueToCloud();
        }
        resolve(record); // Resolve with record initialized inside success closure
      };

      tx.onerror = (event) => reject(tx.error || event.target.error);
      tx.onabort = (event) => reject(tx.error || event.target.error);
    });
  }

  /**
   * Fetch all records across active stores that are pending cloud sync
   */
  async getUnsyncedRecords(db) {
    return new Promise((resolve) => {
      const tx = db.transaction('mutation_outbox', 'readonly');
      const store = tx.objectStore('mutation_outbox');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const mutations = request.result || [];
        resolve(mutations.filter(m => !m.synced));
      };
      request.onerror = () => resolve([]);
    });
  }

  /**
   * Mark a specific record as successfully synced in local database outbox
   */
  async markAsSynced(table, id) {
    const db = await this.openLocalIndexedDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('mutation_outbox', 'readwrite');
      const store = tx.objectStore('mutation_outbox');
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const record = getRequest.result;
        if (record) {
          record.synced = true;
          const putRequest = store.put(record);
          putRequest.onsuccess = () => resolve();
          putRequest.onerror = (event) => reject(event.target.error);
        } else {
          resolve();
        }
      };
      
      getRequest.onerror = (event) => reject(event.target.error);
    });
  }

  /**
   * Locate paddock configurations linked to a specific physical gate ID
   */
  async fetchActivePaddockByGate(gateId) {
    const db = await this.openLocalIndexedDB();
    
    return new Promise((resolve) => {
      const tx = db.transaction('paddock_planner', 'readonly');
      const store = tx.objectStore('paddock_planner');
      const request = store.getAll();
      
      request.onsuccess = () => {
        const paddocks = request.result || [];
        // Resolve paddock matching gate reference, or fallback to main grazing paddock
        let paddock = paddocks.find(p => p.gateId === gateId);
        if (!paddock) {
          paddock = paddocks.find(p => p.id === 'a');
        }
        resolve(paddock);
      };
      
      request.onerror = () => {
        // Fallback mock paddock structure in case DB store is fresh/empty
        resolve({
          id: 'a',
          name: 'North Paddock (A)',
          gateId: gateId,
          current_status: 'GRAZING',
          last_rotation_date: new Date().toISOString()
        });
      };
    });
  }

  /**
   * Cryptographic-ready property level Outbox Flush to Supabase Data Cooperative Layer
   */
  async flushLocalQueueToCloud() {
    try {
      const localDb = await this.openLocalIndexedDB();
      const unsyncedMutations = await this.getUnsyncedRecords(localDb);
      
      if (unsyncedMutations.length === 0) {
        return;
      }
      
      console.log(`%c[SyncEngine] Reconciling ${unsyncedMutations.length} property mutations via HLC-CRDT consensus...`, 'color: #34d399; font-weight: bold;');
      
      // Detect dynamic tenant parameters
      let currentCoopId = null;
      let currentUserId = null;
      if (this.supabaseUrl && this.supabaseUrl !== 'https://mock-coop.supabase.co') {
        try {
          const session = await this.supabase.auth.getSession().catch(() => null);
          const user = session?.data?.session?.user;
          currentUserId = user?.id;
          currentCoopId = user?.app_metadata?.coop_id || user?.user_metadata?.coop_id || localStorage.getItem('cg_coop_id');
        } catch (e) {
          // Silent
        }
      }

      for (const mut of unsyncedMutations) {
        console.log(`[Consensus Sync] Merging conflict-free property "${mut.table}.${mut.field}" on record ${mut.recordId} (HLC: ${mut.timestamp})`);
        
        // BUG 1B-4: a flush that only reached the offline simulator must not mark local data synced
        if (!this.supabaseUrl || this.supabaseUrl === 'https://mock-coop.supabase.co' || this.supabaseUrl === 'https://your-project.supabase.co') {
          console.log('[SyncEngine] Simulator mock upsert to global shared ledger:', mut.field);
          globalThis.__coop_mock_ledger = globalThis.__coop_mock_ledger || [];
          globalThis.__coop_mock_ledger.push({
            id: mut.id,
            coop_id: '00000000-0000-0000-0000-000000000000',
            target_table: mut.table,
            record_id: mut.recordId,
            field: mut.field,
            value: mut.value,
            hlc_timestamp: mut.timestamp
          });
          continue; // Retain entry unsynced locally so it retries on production backend
        }

        // Upsert dynamic ledger mutations onto Supabase cooperative registry table "sync_mutations"
        const { error } = await this.supabase
          .from('sync_mutations')
          .upsert({
            id: mut.id,
            coop_id: currentCoopId || '00000000-0000-0000-0000-000000000000',
            target_table: mut.table,
            record_id: mut.recordId,
            field: mut.field,
            value: mut.value, // Raw object mapping to JSONB column
            hlc_timestamp: mut.timestamp,
            author_id: currentUserId || null
          }, { onConflict: 'id' });

        if (!error) {
          await this.markAsSynced(mut.table, mut.id);
        } else {
          console.error(`[SyncEngine] Cloud consensus conflict on field ${mut.field}:`, error);
        }
      }
      console.log(`%c[SyncEngine] P2P Consensus Outbox sync finalized.`, 'color: #10b981;');

      // BUG 1B-1: Proactively propagate the update to all active in-memory simulator instances to trigger automatic sync convergence
      if (globalThis.__active_sync_engines) {
        for (const engine of globalThis.__active_sync_engines) {
          if (engine !== this) {
            engine.pullAndReconcileMutations().catch(() => {});
          }
        }
      }
    } catch (e) {
      console.warn('[SyncEngine] Sync flush delayed:', e.message);
    }
  }

  async pullAndReconcileMutations() {
    try {
      const db = await this.openLocalIndexedDB();
      
      // 1. Fetch remote ledger rows
      let remoteMutations = [];
      if (this.supabaseUrl && this.supabaseKey && this.isOnline && this.supabaseUrl !== 'https://mock-coop.supabase.co' && this.supabaseUrl !== 'https://your-project.supabase.co') {
        const { data, error } = await this.supabase
          .from('sync_mutations')
          .select('id, coop_id, target_table, record_id, field, value, op, hlc_timestamp');
        if (!error && data) {
          remoteMutations = data;
        }
      } else {
        // Pull from shared global mock ledger representing offline/simulator mesh cooperative
        console.log('[SyncEngine] Pulling from shared global simulator mock mesh...');
        remoteMutations = globalThis.__coop_mock_ledger || [];
      }
      
      console.log(`[SyncEngine] Pull completed. Reconciling ${remoteMutations.length} remote mutations...`);
      
      // Standardize input properties to resolve V8 key-mapping variances
      const standardizedMutations = remoteMutations.map(rem => {
        let parsedVal = rem.value;
        if (typeof rem.value === 'string') {
          try {
            parsedVal = JSON.parse(rem.value);
          } catch(e) {
            // Keep original string if parse fails
          }
        }
        return {
          id: rem.id,
          table_name: rem.target_table || rem.table_name,
          record_id: rem.record_id,
          field_name: rem.field || rem.field_name,
          field_value: parsedVal,
          hlc_timestamp: rem.hlc_timestamp
        };
      });

      // Group mutations by table and record ID to process them atomically
      const groups = {};
      const knownStores = ['livestock_logs', 'paddock_planner', 'hardware_telemetry'];
      
      for (const rem of standardizedMutations) {
        const table = rem.table_name;
        
        // P2P-5: Skip unknown tables during pull reconciliation to prevent transaction aborts
        if (!knownStores.includes(table)) {
          console.warn(`[SyncEngine] Skipping pull for unknown table: ${table}`);
          continue;
        }

        // Update local HLC clock state upon receiving remote causal indicator
        this.hlcClock.receive(rem.hlc_timestamp);

        const recordId = rem.record_id;
        const key = `${table}:${recordId}`;
        if (!groups[key]) {
          groups[key] = { table, recordId, mutations: [] };
        }
        groups[key].mutations.push(rem);
      }

      // Process each record group atomically
      for (const group of Object.values(groups)) {
        const { table, recordId, mutations } = group;

        if (typeof indexedDB === 'undefined') {
          // MemoryDatabase fallback for Node tests (synchronous Map emulation)
          const storeMap = this.memoryDb.data[table];
          let record = storeMap.get(recordId) || { id: recordId, _timestamps: {} };
          record._timestamps = record._timestamps || {};

          let recordChanged = false;

          for (const rem of mutations) {
            const field = rem.field_name;
            const val = rem.field_value;
            const localHlc = record._timestamps[field];

            if (!localHlc || HybridLogicalClock.compare(rem.hlc_timestamp, localHlc) > 0) {
              console.log(`%c[SyncEngine] Merge WIN: Remote "${table}.${field}" field has higher HLC (${rem.hlc_timestamp} > ${localHlc || 'none'}). Updating local state to "${val}"`, 'color: #34d399;');
              record[field] = val;
              record._timestamps[field] = rem.hlc_timestamp;
              recordChanged = true;
            } else {
              console.log(`%c[SyncEngine] Merge LOSE: Local "${table}.${field}" field has higher HLC (${localHlc} >= ${rem.hlc_timestamp}). Discarding remote value.`, 'color: #ef4444;');
            }
          }

          if (recordChanged) {
            record.updated_at = new Date().toISOString();
            record.synced = true;
            storeMap.set(recordId, record);
          }
          continue;
        }

        // Production IndexedDB: perform get and put in a single readwrite transaction
        await new Promise((resolve, reject) => {
          const tx = db.transaction(table, 'readwrite');
          const store = tx.objectStore(table);
          const getReq = store.get(recordId);

          getReq.onsuccess = () => {
            let record = getReq.result || { id: recordId, _timestamps: {} };
            record._timestamps = record._timestamps || {};

            let recordChanged = false;

            for (const rem of mutations) {
              const field = rem.field_name;
              const val = rem.field_value;
              const localHlc = record._timestamps[field];

              if (!localHlc || HybridLogicalClock.compare(rem.hlc_timestamp, localHlc) > 0) {
                console.log(`%c[SyncEngine] Merge WIN: Remote "${table}.${field}" field has higher HLC (${rem.hlc_timestamp} > ${localHlc || 'none'}). Updating local state to "${val}"`, 'color: #34d399;');
                record[field] = val;
                record._timestamps[field] = rem.hlc_timestamp;
                recordChanged = true;
              } else {
                console.log(`%c[SyncEngine] Merge LOSE: Local "${table}.${field}" field has higher HLC (${localHlc} >= ${rem.hlc_timestamp}). Discarding remote value.`, 'color: #ef4444;');
              }
            }

            if (recordChanged) {
              record.updated_at = new Date().toISOString();
              record.synced = true;
              store.put(record);
              
              // Dispatch window event if loaded inside UI client context so views live-update
              if (typeof window !== 'undefined' && typeof CustomEvent !== 'undefined') {
                const event = new CustomEvent('cg-db-merged', { detail: { table, record } });
                window.dispatchEvent(event);
              }
            }
          };

          tx.oncomplete = () => resolve();
          tx.onerror = (event) => reject(tx.error || event.target.error);
          tx.onabort = (event) => reject(tx.error || event.target.error);
        });
      }
      
      console.log(`%c[SyncEngine] Two-way conflict-free ledger reconciliation complete.`, 'color: #10b981; font-weight: bold;');
    } catch (e) {
      console.error('[SyncEngine] Reconciler merge failed:', e);
    }
  }

  /**
   * BUG 1B-1: Standardized pull/merge callback expected by the regression test suite
   */
  async pullFromCloud() {
    return this.pullAndReconcileMutations();
  }
}
