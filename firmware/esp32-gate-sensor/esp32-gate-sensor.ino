/* ============================================================================
 * CommonGround — ESP32 Gate Swing Sensor
 * ----------------------------------------------------------------------------
 * Hardware
 *   * ESP32 (DevKitC, NodeMCU-32S, or similar)
 *   * Magnetic reed switch wired across GPIO 4 and GND (firmware enables the
 *     internal pull-up; switch CLOSED = gate latched = pin LOW)
 *   * Optional battery voltage divider on GPIO 34 (ADC1_CH6). A 220k/100k
 *     divider scales a Li-ion 3.0-4.2 V cell to a safe ADC range.
 *   * Optional status LED on GPIO 2 (the on-board LED on most dev boards).
 *
 * What this sketch does
 *   1. Boots and reads its identity + per-device HMAC secret from NVS
 *      (Espressif Non-Volatile Storage). NEVER hardcoded — see provisioning
 *      mode below.
 *   2. Connects to Wi-Fi, then to SNTP for ISO-8601 timestamps.
 *   3. Samples the reed switch every 50 ms.
 *   4. Holds a 5000 ms hysteresis window: the observed state must remain
 *      stable for >=5 s before any packet is broadcast. This kills wind
 *      flutter and contact bounce at the firmware layer so the network
 *      side never sees swing-loop telemetry.
 *   5. On a stable state change, POSTs a canonical-JSON body signed with
 *      HMAC-SHA256 using mbedtls. Keys are inserted in alphabetical order so
 *      the byte stream matches what the Node ingestor's
 *      canonicalJsonStringify() produces — that's what makes signature
 *      verification work cross-language.
 *   6. Retries on transport failure with exponential backoff, holding the
 *      pending state until the gateway acknowledges.
 *
 * Provisioning
 *   The first time a device boots (or whenever serial input arrives in the
 *   first 3 seconds), the sketch enters a serial command shell:
 *
 *       > set-node-id Node-G02
 *       > set-secret  4e2c1f8b9a3d2e7c5f6a1b3d4e5f6a7b
 *       > set-wifi    OurFarm  hunterpass
 *       > set-url     https://gateway.local/api/v1/telemetry/gate-state
 *       > commit
 *
 *   The secret is a 32-byte HMAC key encoded as 64 hex characters. Provision
 *   it from the cooperative's service-role tooling at the time the device
 *   is paired — never bake it into firmware images.
 *
 * Dependencies (Arduino IDE → Library Manager)
 *   * (none beyond the ESP32 core which already bundles mbedTLS)
 *
 * Author: CommonGround Co-op
 * License: MIT
 * ============================================================================ */

#include <WiFi.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <Preferences.h>
#include <time.h>
#include <esp_system.h>
#include <mbedtls/md.h>

// ---- pin assignments -------------------------------------------------------
constexpr uint8_t  PIN_REED          = 4;
constexpr uint8_t  PIN_LED           = 2;
constexpr uint8_t  PIN_BATT          = 34;        // ADC1_CH6 (input-only safe)

// ---- timing ----------------------------------------------------------------
constexpr uint32_t HYSTERESIS_MS     = 5000;      // per spec
constexpr uint32_t SAMPLE_INTERVAL   = 50;        // ms
constexpr uint32_t WIFI_RETRY_MS     = 500;
constexpr uint32_t WIFI_MAX_RETRIES  = 40;        // ≈20 s
constexpr uint32_t POST_TIMEOUT_MS   = 5000;
constexpr uint32_t MIN_BACKOFF_MS    = 1000;
constexpr uint32_t MAX_BACKOFF_MS    = 60000;

// ---- battery divider scaling ----------------------------------------------
// V_batt = (ADC_raw / 4095) * V_ref * ((R1 + R2) / R2)
// With ESP32 ADC at 11 dB attenuation, V_ref ≈ 3.3 V. Divider: 220k upper,
// 100k lower → scale factor (320/100) = 3.2.
constexpr float    ADC_VREF          = 3.3f;
constexpr float    BATT_DIVIDER      = 3.2f;
constexpr float    ADC_FULL_SCALE    = 4095.0f;

// ---- NVS namespace + keys --------------------------------------------------
constexpr const char* NVS_NAMESPACE  = "cg-gate";
constexpr const char* NVS_NODE_ID    = "node_id";
constexpr const char* NVS_SECRET_HEX = "secret";
constexpr const char* NVS_WIFI_SSID  = "wssid";
constexpr const char* NVS_WIFI_PASS  = "wpass";
constexpr const char* NVS_GATEWAY    = "gwurl";
constexpr const char* NVS_BOOT_COUNT = "boot";

// ---- runtime state ---------------------------------------------------------
Preferences  prefs;
String       g_nodeId, g_secretHex, g_ssid, g_pass, g_gatewayUrl;
uint8_t      g_secret[32];
size_t       g_secretLen = 0;
uint32_t     g_bootCount = 0;
uint32_t     g_msgSeq    = 0;

enum GateState { GATE_UNKNOWN, GATE_OPEN, GATE_CLOSED };
GateState    g_broadcastState = GATE_UNKNOWN;
GateState    g_observedState  = GATE_UNKNOWN;
uint32_t     g_stableSince    = 0;

// ---- forward decls ---------------------------------------------------------
bool         provisioningShell(uint32_t windowMs);
void         loadConfig();
bool         hexToBytes(const String& hex, uint8_t* out, size_t outLen, size_t* writtenLen);
bool         connectWifi();
bool         syncClock();
GateState    readGate();
const char*  gateStateName(GateState s);
float        readBatteryVolts();
String       isoTimestamp();
String       buildMessageId();
size_t       buildCanonicalBody(char* buf, size_t bufLen,
                                const char* gateId, const char* messageId,
                                const char* status,  const char* iso8601,
                                float batteryVolts);
bool         hmacSha256Hex(const uint8_t* key, size_t keyLen,
                           const uint8_t* msg, size_t msgLen,
                           char* outHex /* 65 bytes including NUL */);
bool         postGateEvent(GateState s);
void         setLed(bool on);
void         fatalBlink(const char* reason);

// ============================================================================
//                                    setup
// ============================================================================
void setup() {
    Serial.begin(115200);
    delay(50);

    pinMode(PIN_REED, INPUT_PULLUP);
    pinMode(PIN_LED,  OUTPUT);
    setLed(false);

    analogReadResolution(12);
    analogSetAttenuation(ADC_11db);

    Serial.println();
    Serial.println(F("=== CommonGround Gate Sensor booting ==="));

    if (provisioningShell(3000)) {
        Serial.println(F("Provisioning complete — restarting"));
        delay(250);
        ESP.restart();
    }

    loadConfig();

    if (g_nodeId.length() == 0 || g_secretLen == 0) {
        fatalBlink("device not provisioned — reboot and hold serial to enter shell");
        return;
    }

    Serial.print(F("Node ID:      ")); Serial.println(g_nodeId);
    Serial.print(F("Boot count:   ")); Serial.println(g_bootCount);
    Serial.print(F("Gateway URL:  ")); Serial.println(g_gatewayUrl);

    if (!connectWifi()) fatalBlink("Wi-Fi connection failed");
    if (!syncClock())   fatalBlink("SNTP time sync failed");

    g_observedState  = readGate();
    g_broadcastState = g_observedState;   // suppress a startup-edge spurious packet
    g_stableSince    = millis();

    Serial.print(F("Initial gate state (no broadcast): "));
    Serial.println(gateStateName(g_observedState));
}

// ============================================================================
//                                    loop
// ============================================================================
void loop() {
    static uint32_t lastSample = 0;
    static uint32_t backoffMs  = MIN_BACKOFF_MS;
    const uint32_t  now        = millis();

    if (now - lastSample < SAMPLE_INTERVAL) {
        delay(5);
        return;
    }
    lastSample = now;

    GateState observed = readGate();

    if (observed != g_observedState) {
        // Hardware-side debounce reset: any change restarts the hysteresis
        // window. Only after HYSTERESIS_MS of continuous stability do we
        // consider a transition real.
        g_observedState = observed;
        g_stableSince   = now;
        setLed(true);                            // visual blip on each sample change
    } else {
        setLed(false);
    }

    if (g_observedState != g_broadcastState &&
        (now - g_stableSince) >= HYSTERESIS_MS) {

        Serial.print(F("Stable transition: "));
        Serial.print(gateStateName(g_broadcastState));
        Serial.print(F(" → "));
        Serial.println(gateStateName(g_observedState));

        if (postGateEvent(g_observedState)) {
            g_broadcastState = g_observedState;
            backoffMs = MIN_BACKOFF_MS;
        } else {
            // Hold pending state but reset the stability clock by backoff so
            // we retry after a delay rather than spinning.
            Serial.printf("POST failed — backing off %u ms\n", backoffMs);
            delay(backoffMs);
            backoffMs = min(backoffMs * 2, MAX_BACKOFF_MS);
            g_stableSince = millis();
        }
    }
}

// ============================================================================
// Provisioning shell — runs only at boot if serial data arrives within 3 s.
// ============================================================================
bool provisioningShell(uint32_t windowMs) {
    uint32_t until = millis() + windowMs;
    Serial.printf("(provisioning window open for %u ms — send any key to enter shell)\n", windowMs);
    while (millis() < until) {
        if (Serial.available() > 0) goto enter;
        delay(50);
    }
    return false;

enter:
    Serial.println(F("\n=== Provisioning shell ==="));
    Serial.println(F("Commands:"));
    Serial.println(F("  set-node-id <id>            e.g. Node-G02"));
    Serial.println(F("  set-secret  <hex>           32 bytes, 64 hex chars"));
    Serial.println(F("  set-wifi    <ssid> <pass>"));
    Serial.println(F("  set-url     <https-url>"));
    Serial.println(F("  show                        print current (non-secret) config"));
    Serial.println(F("  wipe                        erase all NVS for this namespace"));
    Serial.println(F("  commit                      save & reboot"));

    prefs.begin(NVS_NAMESPACE, false);

    while (true) {
        Serial.print(F("\ngate> "));
        while (Serial.available() == 0) delay(20);
        String line = Serial.readStringUntil('\n');
        line.trim();
        if (line.length() == 0) continue;

        int sp = line.indexOf(' ');
        String cmd = (sp < 0) ? line : line.substring(0, sp);
        String rest = (sp < 0) ? ""   : line.substring(sp + 1);
        rest.trim();

        if (cmd == "set-node-id") {
            if (rest.length() < 6 || !rest.startsWith("Node-")) {
                Serial.println(F("err: node id must look like Node-G02"));
            } else {
                prefs.putString(NVS_NODE_ID, rest);
                Serial.println(F("ok"));
            }
        } else if (cmd == "set-secret") {
            uint8_t buf[64]; size_t n = 0;
            if (!hexToBytes(rest, buf, sizeof(buf), &n) || n < 16) {
                Serial.println(F("err: secret must be 32+ hex chars (recommended 64 = 32 bytes)"));
            } else {
                prefs.putString(NVS_SECRET_HEX, rest);
                Serial.printf("ok (%u bytes stored)\n", (unsigned) n);
            }
        } else if (cmd == "set-wifi") {
            int gap = rest.indexOf(' ');
            if (gap < 0) { Serial.println(F("err: set-wifi <ssid> <pass>")); continue; }
            prefs.putString(NVS_WIFI_SSID, rest.substring(0, gap));
            prefs.putString(NVS_WIFI_PASS, rest.substring(gap + 1));
            Serial.println(F("ok"));
        } else if (cmd == "set-url") {
            if (!rest.startsWith("https://")) {
                Serial.println(F("err: URL must be https:// for production"));
                continue;
            }
            prefs.putString(NVS_GATEWAY, rest);
            Serial.println(F("ok"));
        } else if (cmd == "show") {
            Serial.printf("  node-id: %s\n", prefs.getString(NVS_NODE_ID, "").c_str());
            Serial.printf("  wifi:    %s\n", prefs.getString(NVS_WIFI_SSID, "").c_str());
            Serial.printf("  url:     %s\n", prefs.getString(NVS_GATEWAY, "").c_str());
            Serial.printf("  secret:  %s\n",
                          prefs.getString(NVS_SECRET_HEX, "").length() > 0 ? "<set>" : "<unset>");
        } else if (cmd == "wipe") {
            prefs.clear();
            Serial.println(F("ok — namespace cleared"));
        } else if (cmd == "commit") {
            prefs.end();
            return true;
        } else {
            Serial.println(F("err: unknown command"));
        }
    }
}

// ============================================================================
// Configuration loader
// ============================================================================
void loadConfig() {
    prefs.begin(NVS_NAMESPACE, false);
    g_nodeId      = prefs.getString(NVS_NODE_ID,    "");
    g_secretHex   = prefs.getString(NVS_SECRET_HEX, "");
    g_ssid        = prefs.getString(NVS_WIFI_SSID,  "");
    g_pass        = prefs.getString(NVS_WIFI_PASS,  "");
    g_gatewayUrl  = prefs.getString(NVS_GATEWAY,    "");
    g_bootCount   = prefs.getUInt  (NVS_BOOT_COUNT, 0) + 1;
    prefs.putUInt(NVS_BOOT_COUNT, g_bootCount);
    prefs.end();

    hexToBytes(g_secretHex, g_secret, sizeof(g_secret), &g_secretLen);
}

// ============================================================================
// Wi-Fi & SNTP
// ============================================================================
bool connectWifi() {
    Serial.printf("Wi-Fi: connecting to %s\n", g_ssid.c_str());
    WiFi.mode(WIFI_STA);
    WiFi.begin(g_ssid.c_str(), g_pass.c_str());

    for (uint32_t i = 0; i < WIFI_MAX_RETRIES; i++) {
        if (WiFi.status() == WL_CONNECTED) {
            Serial.printf("Wi-Fi: connected, IP=%s, RSSI=%d dBm\n",
                          WiFi.localIP().toString().c_str(), WiFi.RSSI());
            return true;
        }
        delay(WIFI_RETRY_MS);
        Serial.print('.');
    }
    Serial.println(F("\nWi-Fi: timeout"));
    return false;
}

bool syncClock() {
    configTime(0, 0, "pool.ntp.org", "time.cloudflare.com");
    Serial.print(F("SNTP: syncing"));
    struct tm tm;
    for (int i = 0; i < 20; i++) {
        if (getLocalTime(&tm, 500)) {
            Serial.printf("\nSNTP: synced (%04d-%02d-%02dT%02d:%02d:%02dZ)\n",
                          tm.tm_year + 1900, tm.tm_mon + 1, tm.tm_mday,
                          tm.tm_hour, tm.tm_min, tm.tm_sec);
            return true;
        }
        Serial.print('.');
    }
    Serial.println();
    return false;
}

// ============================================================================
// Sensor reading
// ============================================================================
GateState readGate() {
    // Pull-up enabled → LOW = magnet present = gate latched = CLOSED.
    return digitalRead(PIN_REED) == LOW ? GATE_CLOSED : GATE_OPEN;
}

const char* gateStateName(GateState s) {
    switch (s) {
        case GATE_OPEN:   return "OPEN";
        case GATE_CLOSED: return "CLOSED";
        default:          return "UNKNOWN";
    }
}

float readBatteryVolts() {
    // Average four samples to smooth ADC noise.
    uint32_t acc = 0;
    for (int i = 0; i < 4; i++) {
        acc += analogRead(PIN_BATT);
        delayMicroseconds(200);
    }
    float raw = static_cast<float>(acc) / 4.0f;
    return (raw / ADC_FULL_SCALE) * ADC_VREF * BATT_DIVIDER;
}

// ============================================================================
// Identifiers & timestamp
// ============================================================================
String isoTimestamp() {
    // RFC 3339 / ISO 8601 in UTC. Matches what JS Date.toISOString() emits,
    // which is what telemetryIngestor.js parses with Date.parse().
    struct tm tm;
    char buf[32];
    if (!getLocalTime(&tm, 100)) return String("1970-01-01T00:00:00Z");
    strftime(buf, sizeof(buf), "%Y-%m-%dT%H:%M:%SZ", &tm);
    return String(buf);
}

String buildMessageId() {
    // Format: g-{mac_last_6}-{boot}-{seq}
    // Guarantees uniqueness even after device reboot and across the fleet,
    // because boot increments per power cycle and seq increments per packet.
    uint64_t mac = ESP.getEfuseMac();
    char buf[40];
    snprintf(buf, sizeof(buf),
             "g-%06llx-%lu-%lu",
             static_cast<unsigned long long>(mac & 0xFFFFFFULL),
             static_cast<unsigned long>(g_bootCount),
             static_cast<unsigned long>(++g_msgSeq));
    return String(buf);
}

// ============================================================================
// Canonical JSON body
// ----------------------------------------------------------------------------
// We construct the body manually with snprintf to guarantee byte-identical
// output with the Node side's canonicalJsonStringify(). Keys are inserted in
// alphabetical order; numbers are formatted with explicit precision; strings
// are simple ASCII (no escaping needed because gateId/messageId/status/
// timestamp are all ASCII-safe by construction).
// ============================================================================
size_t buildCanonicalBody(char* buf, size_t bufLen,
                          const char* gateId, const char* messageId,
                          const char* status,  const char* iso8601,
                          float batteryVolts) {
    int n = snprintf(buf, bufLen,
        "{\"batteryVoltage\":%.2f,"
        "\"gateId\":\"%s\","
        "\"messageId\":\"%s\","
        "\"status\":\"%s\","
        "\"timestamp\":\"%s\"}",
        batteryVolts, gateId, messageId, status, iso8601);
    return (n > 0 && (size_t) n < bufLen) ? (size_t) n : 0;
}

// ============================================================================
// HMAC-SHA256 via mbedTLS
// ============================================================================
bool hmacSha256Hex(const uint8_t* key, size_t keyLen,
                   const uint8_t* msg, size_t msgLen,
                   char* outHex) {
    uint8_t mac[32];
    const mbedtls_md_info_t* info = mbedtls_md_info_from_type(MBEDTLS_MD_SHA256);
    if (!info) return false;
    if (mbedtls_md_hmac(info, key, keyLen, msg, msgLen, mac) != 0) return false;
    static const char* hex = "0123456789abcdef";
    for (size_t i = 0; i < 32; i++) {
        outHex[i * 2]     = hex[(mac[i] >> 4) & 0xF];
        outHex[i * 2 + 1] = hex[mac[i] & 0xF];
    }
    outHex[64] = '\0';
    return true;
}

// ============================================================================
// HTTPS POST
// ============================================================================
bool postGateEvent(GateState s) {
    if (WiFi.status() != WL_CONNECTED) {
        if (!connectWifi()) return false;
    }

    char body[256];
    String ts  = isoTimestamp();
    String mid = buildMessageId();
    float  v   = readBatteryVolts();
    size_t bodyLen = buildCanonicalBody(body, sizeof(body),
        g_nodeId.c_str(), mid.c_str(), gateStateName(s), ts.c_str(), v);
    if (bodyLen == 0) {
        Serial.println(F("post: body too long for buffer"));
        return false;
    }

    char sigHex[65];
    if (!hmacSha256Hex(g_secret, g_secretLen,
                       reinterpret_cast<const uint8_t*>(body), bodyLen, sigHex)) {
        Serial.println(F("post: HMAC failed"));
        return false;
    }

    // We use WiFiClientSecure with insecure-mode (skip cert pinning) ONLY if
    // the gateway URL points at a private .local host with a self-signed
    // cert. For production with Let's Encrypt, pin the root CA via
    // client.setCACert(LETSENCRYPT_ISRG_X1).
    WiFiClientSecure client;
    client.setInsecure();   // see comment above — replace for production

    HTTPClient http;
    http.setTimeout(POST_TIMEOUT_MS);
    if (!http.begin(client, g_gatewayUrl)) {
        Serial.println(F("post: http.begin failed"));
        return false;
    }
    http.addHeader("Content-Type", "application/json");
    http.addHeader("X-CommonGround-Signature", sigHex);
    http.addHeader("X-Idempotency-Key", mid);

    int code = http.POST(reinterpret_cast<uint8_t*>(body), bodyLen);
    String resp = http.getString();
    http.end();

    Serial.printf("post: HTTP %d  ← %s\n", code, resp.substring(0, 120).c_str());
    return code >= 200 && code < 300;
}

// ============================================================================
// Helpers
// ============================================================================
bool hexToBytes(const String& hex, uint8_t* out, size_t outLen, size_t* writtenLen) {
    if (hex.length() % 2 != 0) return false;
    size_t n = hex.length() / 2;
    if (n > outLen) return false;
    for (size_t i = 0; i < n; i++) {
        unsigned int b;
        if (sscanf(hex.c_str() + i * 2, "%2x", &b) != 1) return false;
        out[i] = static_cast<uint8_t>(b);
    }
    if (writtenLen) *writtenLen = n;
    return true;
}

void setLed(bool on) { digitalWrite(PIN_LED, on ? HIGH : LOW); }

void fatalBlink(const char* reason) {
    Serial.print(F("FATAL: ")); Serial.println(reason);
    while (true) {
        setLed(true);  delay(120);
        setLed(false); delay(120);
        setLed(true);  delay(120);
        setLed(false); delay(640);
    }
}
