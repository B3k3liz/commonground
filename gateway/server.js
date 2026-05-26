/**
 * gateway/server.js — Edge gateway HTTP server
 * ---------------------------------------------------------------------------
 * Runs on the Raspberry Pi behind NGINX (which terminates TLS and rate-limits
 * inbound traffic). Listens on 127.0.0.1:$PORT so the only public access
 * path is via the reverse proxy.
 *
 * Reads SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY from the environment file
 * /etc/commonground-ingestor.env (mode 0600). The service-role key is
 * sensitive — it bypasses RLS — but its scope is limited to:
 *
 *   * reading hardware_nodes.hmac_secret to verify ESP32 signatures
 *   * inserting into hardware_telemetry with hmac_verified = TRUE
 *   * updating hardware_nodes.last_seen_at
 *   * updating paddock_planner on automated herd rotation
 *
 * Everything else stays behind member-authenticated RLS.
 * ---------------------------------------------------------------------------
 */
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import { TelemetryAgent } from '../telemetryIngestor.js';

const SUPABASE_URL              = required('SUPABASE_URL');
const SUPABASE_SERVICE_ROLE_KEY = required('SUPABASE_SERVICE_ROLE_KEY');
const PORT                      = parseInt(process.env.PORT || '3017', 10);

function required(name) {
    const v = process.env[name];
    if (!v) {
        console.error(`[gateway] FATAL: env ${name} is required`);
        process.exit(1);
    }
    return v;
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
});

const agent = new TelemetryAgent({ supabaseAdmin });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '4kb' }));

app.get('/healthz', (_req, res) => {
    res.status(200).json({ ok: true, ts: new Date().toISOString() });
});

app.post('/api/v1/telemetry/gate-state', async (req, res) => {
    try {
        await agent.handleGateStateWebhook(req, res);
    } catch (err) {
        console.error('[gateway] unhandled webhook error:', err);
        if (!res.headersSent) res.status(500).json({ error: 'internal' });
    }
});

// Catch-all for unknown routes — return JSON 404 instead of HTML.
app.use((_req, res) => res.status(404).json({ error: 'not found' }));

const server = app.listen(PORT, '127.0.0.1', () => {
    console.log(`[gateway] listening on 127.0.0.1:${PORT}`);
    console.log(`[gateway] supabase: ${SUPABASE_URL}`);
});

// Graceful shutdown so systemd's TERM doesn't drop in-flight requests.
function shutdown(sig) {
    console.log(`[gateway] received ${sig}; shutting down`);
    server.close(() => process.exit(0));
    setTimeout(() => process.exit(1), 5000).unref();
}
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
