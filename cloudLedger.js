/**
 * cloudLedger.js — CommonGround Cloud Ledger
 * ---------------------------------------------------------------------------
 * An ADDITIVE Supabase layer. It signs co-op members in, resolves their
 * cooperative, and syncs the ledger (public.ledger_transactions) to the cloud
 * with RLS-enforced per-tenant isolation.
 *
 * The existing app is untouched: it still runs 100% offline on localStorage.
 * This layer activates only when a member is signed in and online — when it
 * does, the ledger view (app.transactions) is backed by the shared database
 * so every member and device sees the same numbers.
 *
 * Loads after vendor/supabase-js.min.js and app.js. If either is missing
 * (e.g. fully offline first load) it degrades silently to local-only.
 *
 * Backend: project omtjnkjqjkfwhaxbyfvb — schema in
 *          supabase/migrations/20260525120000_cooperative_ledger.sql
 * ---------------------------------------------------------------------------
 */
(function () {
  'use strict';

  /* -- config -------------------------------------------------------------- */
  // The publishable key is designed to ship in client code; RLS is the
  // security boundary, not key secrecy.
  //
  // Self-hosters: override via <meta> tags in index.html or window.cgConfig.
  // The hardcoded defaults below point at the demo cooperative project.
  function readConfig(metaName, globalName, fallback) {
    var meta = document.querySelector('meta[name="' + metaName + '"]');
    if (meta && meta.getAttribute('content')) return meta.getAttribute('content');
    if (window.cgConfig && window.cgConfig[globalName]) return window.cgConfig[globalName];
    return fallback;
  }
  var SUPABASE_URL = readConfig('cg-supabase-url', 'supabaseUrl',
      'https://omtjnkjqjkfwhaxbyfvb.supabase.co');
  var SUPABASE_KEY = readConfig('cg-supabase-key', 'supabaseKey',
      'sb_publishable_UONEEiHKSUNoSYVc0yB5MA_fEde2Mhp');

  /* -- state --------------------------------------------------------------- */
  var sb = null;            // supabase client
  var app = null;           // the CommonGroundApp instance
  var session = null;       // current auth session
  var coop = null;          // { id, name, domain, region_state, ... }
  var myRole = null;        // caller's role in the coop
  var syncedIds = new Set();// app-tx ids known to exist in the cloud
  var origSave = null;      // app.saveToStorage before monkey-patch
  var pushTimer = null;
  var busy = false;
  var els = {};

  /* -- tiny utils ---------------------------------------------------------- */
  function log() {
    try {
      console.log.apply(console,
        ['%c[CloudLedger]', 'color:#34d399;font-weight:bold;'].concat([].slice.call(arguments)));
    } catch (e) {}
  }
  function slug(s) {
    return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '').slice(0, 40) || 'coop';
  }
  function rand(n) {
    var s = '';
    while (s.length < n) s += Math.random().toString(36).slice(2);
    return s.slice(0, n);
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* -- field mapping: app tx  <->  ledger_transactions row ----------------- */
  // app tx:  { id, date, desc, category, type:'income'|'expense', amount }
  // db row:  { id, occurred_on, description, category, source, direction,
  //            amount_cents, metadata:{client_id} }
  function mapSource(cat) {
    var c = (cat || '').toLowerCase();
    if (c.indexOf('csa') >= 0)        return 'csa_subscription';
    if (c.indexOf('storefront') >= 0) return 'storefront';
    if (c.indexOf('tool') >= 0)       return 'tool_library';
    if (c.indexOf('livestock') >= 0 || c.indexOf('feed') >= 0) return 'livestock';
    if (c.indexOf('utilit') >= 0)     return 'utilities';
    if (c.indexOf('farm op') >= 0 || c.indexOf('seed') >= 0 || c.indexOf('compost') >= 0) return 'farm_ops';
    if (c.indexOf('barter') >= 0)     return 'barter';
    if (c.indexOf('cottage') >= 0)    return 'cottage_food';
    if (c.indexOf('grant') >= 0)      return 'grant';
    return 'other';
  }
  function rowToTx(r) {
    var m = r.metadata || {};
    return {
      id:       m.client_id || r.id,
      date:     r.occurred_on,
      desc:     r.description,
      category: r.category || 'General',
      type:     r.direction,                       // 'income' | 'expense'
      amount:   (Number(r.amount_cents) || 0) / 100
    };
  }
  function txToRow(tx) {
    return {
      coop_id:      coop.id,
      occurred_on:  tx.date || new Date().toISOString().slice(0, 10),
      description:  String(tx.desc || 'Transaction').slice(0, 500),
      category:     tx.category ? String(tx.category).slice(0, 120) : null,
      source:       mapSource(tx.category),
      direction:    tx.type === 'expense' ? 'expense' : 'income',
      amount_cents: Math.round(Math.abs(Number(tx.amount) || 0) * 100),
      metadata:     { client_id: String(tx.id) }
    };
  }

  /* -- sync ---------------------------------------------------------------- */
  async function resolveCoop() {
    var res = await sb.from('cooperatives').select('*').limit(1);
    if (res.error) throw res.error;
    return (res.data && res.data[0]) || null;
  }

  async function resolveRole() {
    if (!session) return null;
    var res = await sb.from('coop_members').select('role')
      .eq('user_id', session.user.id).limit(1);
    if (res.error) return null;
    return (res.data && res.data[0] && res.data[0].role) || null;
  }

  async function pushTxs(txs) {
    if (!txs.length || !coop) return;
    var res = await sb.from('ledger_transactions')
      .insert(txs.map(txToRow)).select('metadata');
    if (res.error) throw res.error;
    txs.forEach(function (t) { syncedIds.add(String(t.id)); });
    log('pushed ' + txs.length + ' transaction(s) to the cloud');
  }

  // Full reconcile: pull cloud rows, merge with local-only rows, push the
  // local-only ones up. Cloud is the shared source of truth; nothing local
  // is dropped — unsynced local rows are uploaded.
  async function syncNow() {
    var res = await sb.from('ledger_transactions').select('*')
      .is('deleted_at', null).order('occurred_on', { ascending: false });
    if (res.error) throw res.error;

    var cloud = (res.data || []).map(rowToTx);
    var cloudIds = {};
    cloud.forEach(function (t) { cloudIds[String(t.id)] = true; });
    syncedIds = new Set(Object.keys(cloudIds));

    var localOnly = (app.transactions || []).filter(function (t) {
      return !cloudIds[String(t.id)];
    });

    var merged = cloud.concat(localOnly);
    merged.sort(function (a, b) { return String(b.date).localeCompare(String(a.date)); });
    app.transactions = merged;
    if (origSave) origSave();          // persist locally without re-triggering push
    try { app.render(); } catch (e) { log('render after sync failed', e); }

    if (localOnly.length) await pushTxs(localOnly);
    log('sync complete — ' + cloud.length + ' cloud, ' + localOnly.length + ' uploaded');
  }

  // Debounced incremental push, fired after every app.saveToStorage().
  function schedulePush() {
    if (!sb || !session || !coop) return;
    clearTimeout(pushTimer);
    pushTimer = setTimeout(async function () {
      var pending = (app.transactions || []).filter(function (t) {
        return !syncedIds.has(String(t.id));
      });
      if (!pending.length) return;
      try {
        setStatus('sync', 'Syncing…');
        await pushTxs(pending);
        setStatus('ok', 'Synced · ' + coop.name);
      } catch (e) {
        log('incremental push failed', e);
        setStatus('warn', 'Sync pending');
      }
    }, 900);
  }

  /* -- connection lifecycle ----------------------------------------------- */
  async function handleSession(s) {
    session = s || null;
    if (!session) {
      coop = null; myRole = null; syncedIds.clear();
      setStatus('idle', 'Sign in to sync');
      renderBody();
      return;
    }
    await connect();
  }

  async function connect() {
    if (busy) return;
    busy = true;
    try {
      setStatus('sync', 'Connecting…');
      coop = await resolveCoop();
      if (coop && coop.id) {
        localStorage.setItem('cg_coop_id', coop.id);
      }
      if (!coop) {                       // signed in but not in a cooperative yet
        setStatus('warn', 'Finish setup');
        renderBody();
        busy = false;
        return;
      }
      myRole = await resolveRole();
      setStatus('sync', 'Syncing…');
      await syncNow();
      setStatus('ok', 'Synced · ' + coop.name);
      renderBody();
    } catch (e) {
      log('connect failed', e);
      setStatus('warn', 'Sync error');
      renderBody();
    }
    busy = false;
  }

  /* -- auth actions -------------------------------------------------------- */
  async function doSignIn(email, password) {
    var res = await sb.auth.signInWithPassword({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;
  }
  async function doSignUp(email, password) {
    var res = await sb.auth.signUp({ email: email, password: password });
    if (res.error) throw res.error;
    return res.data;                     // data.session is null if email confirm is on
  }
  async function doSignOut() {
    await sb.auth.signOut();
    coop = null; myRole = null; session = null; syncedIds.clear();
    setStatus('idle', 'Sign in to sync');
    renderBody();
  }
  async function doCreateCoop(name, displayName, state) {
    var args = {
      p_domain: slug(name) + '-' + rand(6),
      p_name: name,
      p_display_name: displayName,
      p_region_country: 'US'
    };
    if (state) args.p_region_state = state;
    var res = await sb.rpc('create_cooperative', args);
    if (res.error) throw res.error;
    return res.data;
  }

  /* -- UI ------------------------------------------------------------------ */
  var CLOUD_SVG = '<svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden="true">' +
    '<path d="M19.35 10.04A7.49 7.49 0 0 0 12 4a7.5 7.5 0 0 0-6.96 4.73A6 6 0 0 0 6 20.5h13a5 5 0 0 0 .35-9.96zM19 18.5H6a4 4 0 0 1-.36-7.98l.86-.08.34-.79A5.5 5.5 0 0 1 12 6a5.49 5.49 0 0 1 5.4 4.45l.24 1.25 1.27.09A3 3 0 0 1 19 18.5z"/></svg>';

  function injectStyles() {
    var css = [
      '#cgcl-pill{position:fixed;right:18px;bottom:18px;z-index:99000;display:flex;',
      'align-items:center;gap:8px;padding:9px 14px;border-radius:999px;border:1px solid rgba(255,255,255,.14);',
      'background:rgba(12,28,16,.92);color:#e6efe6;font:600 12.5px/1 system-ui,sans-serif;',
      'cursor:pointer;box-shadow:0 6px 22px rgba(0,0,0,.42);backdrop-filter:blur(7px);transition:transform .12s ease;}',
      '#cgcl-pill:hover{transform:translateY(-2px);}',
      '#cgcl-dot{width:9px;height:9px;border-radius:50%;background:#9aa6a0;flex:none;box-shadow:0 0 0 3px rgba(255,255,255,.05);}',
      '#cgcl-pill.s-ok #cgcl-dot{background:#34d399;}',
      '#cgcl-pill.s-sync #cgcl-dot{background:#38bdf8;animation:cgcl-pulse 1s infinite;}',
      '#cgcl-pill.s-warn #cgcl-dot{background:#fbbf24;}',
      '#cgcl-pill.s-idle #cgcl-dot{background:#9aa6a0;}',
      '#cgcl-pill.s-offline #cgcl-dot{background:#71717a;}',
      '@keyframes cgcl-pulse{0%,100%{opacity:1}50%{opacity:.35}}',
      '#cgcl-modal{position:fixed;inset:0;z-index:99001;display:flex;align-items:center;',
      'justify-content:center;background:rgba(4,10,6,.66);backdrop-filter:blur(3px);padding:20px;}',
      '#cgcl-modal[hidden]{display:none;}',
      '.cgcl-card{width:100%;max-width:380px;background:#10231a;border:1px solid rgba(255,255,255,.12);',
      'border-radius:16px;padding:24px;color:#e6efe6;font-family:system-ui,sans-serif;',
      'box-shadow:0 24px 60px rgba(0,0,0,.55);position:relative;}',
      '.cgcl-card h3{margin:0 0 4px;font-size:1.05rem;}',
      '.cgcl-card p.sub{margin:0 0 16px;font-size:.8rem;color:#9fb0a6;line-height:1.45;}',
      '.cgcl-x{position:absolute;top:12px;right:14px;background:none;border:none;color:#9fb0a6;',
      'font-size:1.5rem;line-height:1;cursor:pointer;}',
      '.cgcl-x:hover{color:#fff;}',
      '.cgcl-field{display:block;margin:0 0 10px;}',
      '.cgcl-field label{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:.04em;',
      'color:#9fb0a6;margin-bottom:4px;}',
      '.cgcl-field input{width:100%;box-sizing:border-box;padding:10px 12px;border-radius:9px;',
      'border:1px solid rgba(255,255,255,.16);background:#0a160f;color:#fff;font-size:.9rem;}',
      '.cgcl-field input:focus{outline:2px solid #34d399;outline-offset:-1px;}',
      '.cgcl-btn{width:100%;padding:11px;border-radius:9px;border:none;cursor:pointer;',
      'font-size:.88rem;font-weight:700;margin-top:6px;}',
      '.cgcl-btn.primary{background:#2da44e;color:#fff;}',
      '.cgcl-btn.primary:hover{background:#34c45c;}',
      '.cgcl-btn.ghost{background:transparent;color:#9fb0a6;border:1px solid rgba(255,255,255,.16);}',
      '.cgcl-btn.ghost:hover{color:#fff;}',
      '.cgcl-btn:disabled{opacity:.55;cursor:default;}',
      '.cgcl-msg{font-size:.78rem;margin:10px 0 0;line-height:1.4;min-height:1em;}',
      '.cgcl-msg.err{color:#fca5a5;}',
      '.cgcl-msg.ok{color:#86efac;}',
      '.cgcl-row{display:flex;gap:8px;}',
      '.cgcl-row .cgcl-field{flex:1;}',
      '.cgcl-meta{font-size:.8rem;color:#cbd5cf;line-height:1.7;margin:0 0 14px;}',
      '.cgcl-meta b{color:#fff;}'
    ].join('');
    var st = document.createElement('style');
    st.id = 'cgcl-styles';
    st.textContent = css;
    document.head.appendChild(st);
  }

  function buildUI() {
    injectStyles();

    var pill = document.createElement('button');
    pill.id = 'cgcl-pill';
    pill.className = 's-idle';
    pill.setAttribute('aria-label', 'Cloud ledger sync');
    pill.innerHTML = '<span id="cgcl-dot"></span>' + CLOUD_SVG +
      '<span id="cgcl-text">Sign in to sync</span>';
    pill.addEventListener('click', openModal);
    document.body.appendChild(pill);

    var modal = document.createElement('div');
    modal.id = 'cgcl-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="cgcl-card">' +
      '<button class="cgcl-x" aria-label="Close">&times;</button>' +
      '<div id="cgcl-body"></div></div>';
    modal.addEventListener('click', function (e) { if (e.target === modal) closeModal(); });
    modal.querySelector('.cgcl-x').addEventListener('click', closeModal);
    document.body.appendChild(modal);

    els.pill = pill;
    els.dot = pill;
    els.text = pill.querySelector('#cgcl-text');
    els.modal = modal;
    els.body = modal.querySelector('#cgcl-body');
  }

  function setStatus(state, text) {
    if (!els.pill) return;
    els.pill.className = 's-' + state;
    els.text.textContent = text;
  }
  function openModal() { renderBody(); els.modal.hidden = false; }
  function closeModal() { els.modal.hidden = true; }

  // Render the modal body for the current state.
  function renderBody() {
    if (!els.body) return;
    if (!sb) {
      els.body.innerHTML = '<h3>Cloud sync unavailable</h3>' +
        '<p class="sub">The Supabase client could not load (you may be offline). ' +
        'CommonGround still works — your ledger is saved on this device and will ' +
        'sync once the connection returns.</p>';
      return;
    }
    if (!session)            return renderAuth();
    if (session && !coop)    return renderCreateCoop();
    return renderConnected();
  }

  function renderAuth() {
    els.body.innerHTML =
      '<h3>Connect the cooperative ledger</h3>' +
      '<p class="sub">Sign in so this device shares one ledger with the rest of ' +
      'your cooperative. New here? Create an account first.</p>' +
      '<div class="cgcl-field"><label>Email</label>' +
      '<input id="cgcl-email" type="email" autocomplete="email" placeholder="you@farm.coop"></div>' +
      '<div class="cgcl-field"><label>Password</label>' +
      '<input id="cgcl-pass" type="password" autocomplete="current-password" placeholder="••••••••"></div>' +
      '<button class="cgcl-btn primary" id="cgcl-signin">Sign in</button>' +
      '<button class="cgcl-btn ghost" id="cgcl-signup">Create an account</button>' +
      '<p class="cgcl-msg" id="cgcl-msg"></p>';

    var email = els.body.querySelector('#cgcl-email');
    var pass = els.body.querySelector('#cgcl-pass');
    var msg = els.body.querySelector('#cgcl-msg');

    function guard() {
      if (!email.value || !pass.value) { setMsg(msg, 'err', 'Enter an email and password.'); return false; }
      return true;
    }
    els.body.querySelector('#cgcl-signin').addEventListener('click', async function () {
      if (!guard()) return;
      await run(this, msg, 'Signing in…', async function () {
        await doSignIn(email.value.trim(), pass.value);
        // onAuthStateChange drives connect(); just refresh the modal.
        renderBody();
      });
    });
    els.body.querySelector('#cgcl-signup').addEventListener('click', async function () {
      if (!guard()) return;
      await run(this, msg, 'Creating account…', async function () {
        var data = await doSignUp(email.value.trim(), pass.value);
        if (!data.session) {
          setMsg(msg, 'ok', 'Account created. Check your email to confirm it, then sign in.');
        } else {
          renderBody();
        }
      });
    });
  }

  function renderCreateCoop() {
    els.body.innerHTML =
      '<h3>Name your cooperative</h3>' +
      '<p class="sub">You are signed in as ' + esc(session.user.email) +
      '. Create your cooperative — you become its first owner and the ledger ' +
      'is scoped to it.</p>' +
      '<div class="cgcl-field"><label>Cooperative name</label>' +
      '<input id="cgcl-coop" type="text" placeholder="Oak Creek Homestead"></div>' +
      '<div class="cgcl-row">' +
      '<div class="cgcl-field"><label>Your display name</label>' +
      '<input id="cgcl-dname" type="text" placeholder="Bekah"></div>' +
      '<div class="cgcl-field" style="max-width:96px;"><label>State</label>' +
      '<input id="cgcl-state" type="text" maxlength="2" placeholder="OR"></div>' +
      '</div>' +
      '<button class="cgcl-btn primary" id="cgcl-mk">Create cooperative</button>' +
      '<button class="cgcl-btn ghost" id="cgcl-out">Sign out</button>' +
      '<p class="cgcl-msg" id="cgcl-msg"></p>';

    var coopN = els.body.querySelector('#cgcl-coop');
    var dName = els.body.querySelector('#cgcl-dname');
    var state = els.body.querySelector('#cgcl-state');
    var msg = els.body.querySelector('#cgcl-msg');

    els.body.querySelector('#cgcl-mk').addEventListener('click', async function () {
      if (!coopN.value.trim() || !dName.value.trim()) {
        setMsg(msg, 'err', 'Enter a cooperative name and your display name.'); return;
      }
      var st = state.value.trim().toUpperCase();
      if (st && st.length !== 2) { setMsg(msg, 'err', 'State must be a 2-letter code (or blank).'); return; }
      await run(this, msg, 'Creating…', async function () {
        await doCreateCoop(coopN.value.trim(), dName.value.trim(), st || null);
        await connect();
      });
    });
    els.body.querySelector('#cgcl-out').addEventListener('click', function () { doSignOut(); });
  }

  function renderConnected() {
    var count = (app.transactions || []).length;
    els.body.innerHTML =
      '<h3>Cooperative ledger connected</h3>' +
      '<p class="sub">This device shares one live ledger with your cooperative. ' +
      'New transactions sync automatically.</p>' +
      '<p class="cgcl-meta">' +
      'Signed in&nbsp;&nbsp;<b>' + esc(session.user.email) + '</b><br>' +
      'Cooperative&nbsp;&nbsp;<b>' + esc(coop.name) + '</b>' +
      (myRole ? '&nbsp;&nbsp;<span style="opacity:.7;">(' + esc(myRole) + ')</span>' : '') + '<br>' +
      'Ledger rows&nbsp;&nbsp;<b>' + count + '</b> synced' +
      '</p>' +
      '<button class="cgcl-btn primary" id="cgcl-sync">Sync now</button>' +
      '<button class="cgcl-btn ghost" id="cgcl-out">Sign out</button>' +
      '<p class="cgcl-msg" id="cgcl-msg"></p>';

    var msg = els.body.querySelector('#cgcl-msg');
    els.body.querySelector('#cgcl-sync').addEventListener('click', async function () {
      await run(this, msg, 'Syncing…', async function () {
        setStatus('sync', 'Syncing…');
        await syncNow();
        setStatus('ok', 'Synced · ' + coop.name);
        setMsg(msg, 'ok', 'Ledger is up to date — ' + (app.transactions || []).length + ' rows.');
        renderConnected();
      });
    });
    els.body.querySelector('#cgcl-out').addEventListener('click', function () { doSignOut(); });
  }

  /* -- small UI helpers ---------------------------------------------------- */
  function setMsg(el, cls, text) {
    if (!el) return;
    el.className = 'cgcl-msg ' + (cls || '');
    el.textContent = text || '';
  }
  // Run an async action with button disabling + error surfacing.
  async function run(btn, msg, busyLabel, fn) {
    var label = btn.textContent;
    btn.disabled = true; btn.textContent = busyLabel;
    setMsg(msg, '', '');
    try {
      await fn();
    } catch (e) {
      log('action failed', e);
      setMsg(msg, 'err', (e && e.message) ? e.message : 'Something went wrong.');
    }
    btn.disabled = false; btn.textContent = label;
  }

  /* -- boot ---------------------------------------------------------------- */
  function whenReady(cb) {
    var tries = 0;
    (function poll() {
      if (window.app) return cb();
      if (++tries > 100) { log('window.app never appeared — cloud layer idle'); return; }
      setTimeout(poll, 50);
    })();
  }

  function boot() {
    app = window.app;
    buildUI();

    // Monkey-patch persistence so every local save schedules a cloud push.
    if (typeof app.saveToStorage === 'function') {
      origSave = app.saveToStorage.bind(app);
      app.saveToStorage = function () { origSave(); schedulePush(); };
    }

    if (!window.supabase || !window.supabase.createClient) {
      setStatus('offline', 'Cloud unavailable');
      log('supabase-js not present — running local-only');
      return;
    }

    sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
    sb.auth.onAuthStateChange(function (_evt, s) { handleSession(s); });
    sb.auth.getSession().then(function (res) {
      handleSession(res && res.data ? res.data.session : null);
    });

    window.addEventListener('online', function () {
      if (session && coop) connect();
    });

    // Expose a small handle for debugging / future modules (Task 2 sync).
    window.cloudLedger = {
      syncNow: function () { return syncNow(); },
      status:  function () { return { session: !!session, coop: coop, synced: syncedIds.size }; },

      // T1.3 / T2.3: hardware-node pairing + secret rotation.
      // Both call SECURITY DEFINER RPCs that enforce coop-admin role server
      // side; the returned hex string is the secret to paste into the
      // ESP32's serial `set-secret <hex>` command.
      provisionHardwareNode: async function (opts) {
        if (!sb || !session) throw new Error('Sign in to pair sensors');
        var res = await sb.rpc('provision_hardware_node', {
          p_node_id:        opts.nodeId,
          p_node_type:      opts.nodeType,
          p_display_name:   opts.displayName || null,
          p_nonce_window_s: opts.nonceWindowS || 300
        });
        if (res.error) throw res.error;
        return res.data;        // 64-char hex secret
      },
      rotateHardwareNodeSecret: async function (nodeId) {
        if (!sb || !session) throw new Error('Sign in to rotate secrets');
        var res = await sb.rpc('rotate_hardware_node_secret', { p_node_id: nodeId });
        if (res.error) throw res.error;
        return res.data;
      },
      listHardwareNodes: async function () {
        if (!sb || !session) throw new Error('Sign in to list sensors');
        var res = await sb.from('hardware_nodes_public').select('*').order('created_at', { ascending: false });
        if (res.error) throw res.error;
        return res.data || [];
      },

      // T3.4: push the operator's chosen state code into cooperatives.region_state
      // so the cottage-food and extension data is durable across devices.
      // Returns a promise; resolves null if not signed in or no coop yet.
      updateRegionState: async function (stateCode) {
        if (!sb || !session || !coop) return null;
        var code = (stateCode || '').toUpperCase();
        if (code && !/^[A-Z]{2}$/.test(code)) {
          throw new Error('region_state must be a 2-letter US state code');
        }
        var res = await sb.from('cooperatives')
          .update({ region_state: code || null, updated_at: new Date().toISOString() })
          .eq('id', coop.id)
          .select('id, region_state')
          .single();
        if (res.error) {
          log('region_state update failed:', res.error.message);
          throw res.error;
        }
        coop.region_state = res.data.region_state;
        log('region_state synced to cooperatives:', coop.region_state);
        return coop.region_state;
      }
    };
    log('cloud ledger initialised');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { whenReady(boot); });
  } else {
    whenReady(boot);
  }
})();
