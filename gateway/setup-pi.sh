#!/usr/bin/env bash
# ============================================================================
# CommonGround Co-op — Raspberry Pi Edge Gateway setup
# ----------------------------------------------------------------------------
# Idempotent installer for the on-farm gateway. Re-run safely; each step is
# guarded so unchanged components are not redone.
#
# What it does
#   1. Installs nginx + node + openssl (skips if present)
#   2. Generates a self-signed TLS certificate for gateway.local (skips if
#      a valid cert is already in place)
#   3. Generates a 2048-bit DH parameter file (slow on a Pi Zero — runs once,
#      cached forever)
#   4. Installs the Node ingestor as a systemd service
#   5. Writes the NGINX site file from this repo and reloads nginx
#
# Run on a Pi running Raspberry Pi OS Bookworm (or any Debian 12+):
#       sudo ./setup-pi.sh
#
# Switching to Let's Encrypt later:
#       sudo certbot certonly --webroot -w /var/www/letsencrypt -d <hostname>
#       Then edit /etc/nginx/sites-available/commonground-gateway.conf to
#       point ssl_certificate / ssl_certificate_key at the Let's Encrypt
#       paths and `systemctl reload nginx`.
# ============================================================================

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &> /dev/null && pwd)"
REPO_ROOT="$(cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd)"

HOSTNAME_DEFAULT="gateway.local"
HOSTNAME_CG="${HOSTNAME_CG:-$HOSTNAME_DEFAULT}"

INGESTOR_USER="commonground"
INGESTOR_HOME="/opt/commonground-ingestor"
INGESTOR_PORT=3017

NGINX_SITE_AVAILABLE="/etc/nginx/sites-available/commonground-gateway.conf"
NGINX_SITE_ENABLED="/etc/nginx/sites-enabled/commonground-gateway.conf"
SSL_DIR="/etc/nginx/ssl"

require_root() {
    if [[ $EUID -ne 0 ]]; then
        echo "ERROR: run as root (sudo $0)" >&2
        exit 1
    fi
}

step() { printf '\n\033[1;32m▶ %s\033[0m\n' "$*"; }
note() { printf '  • %s\n' "$*"; }

# ----------------------------------------------------------------------------
# 1. Packages
# ----------------------------------------------------------------------------
install_packages() {
    step "Installing system packages"
    apt-get update -qq
    apt-get install -y --no-install-recommends \
        nginx openssl curl ca-certificates gnupg
    if ! command -v node &>/dev/null; then
        note "Installing Node.js 20.x"
        curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
        apt-get install -y nodejs
    else
        note "Node.js already present ($(node --version))"
    fi
}

# ----------------------------------------------------------------------------
# 2. TLS cert + DH params
# ----------------------------------------------------------------------------
provision_tls() {
    step "Provisioning self-signed TLS material in $SSL_DIR"
    mkdir -p "$SSL_DIR"
    chmod 750 "$SSL_DIR"

    if [[ ! -f "$SSL_DIR/commonground-gateway.crt" \
       || ! -f "$SSL_DIR/commonground-gateway.key" ]]; then
        note "Generating self-signed cert for $HOSTNAME_CG (valid 825 days)"
        openssl req -x509 -nodes -newkey rsa:2048 \
            -days 825 \
            -keyout "$SSL_DIR/commonground-gateway.key" \
            -out    "$SSL_DIR/commonground-gateway.crt" \
            -subj "/CN=$HOSTNAME_CG/O=CommonGround Cooperative" \
            -addext "subjectAltName=DNS:$HOSTNAME_CG,DNS:commonground-gateway.local"
        chmod 640 "$SSL_DIR/commonground-gateway.key"
    else
        note "Cert + key already present — leaving in place"
    fi

    if [[ ! -f "$SSL_DIR/dhparam.pem" ]]; then
        note "Generating 2048-bit DH parameters (slow on a Pi — be patient)"
        openssl dhparam -out "$SSL_DIR/dhparam.pem" 2048
    else
        note "DH params already present"
    fi
}

# ----------------------------------------------------------------------------
# 3. NGINX site
# ----------------------------------------------------------------------------
install_nginx_site() {
    step "Installing NGINX site config"
    install -m 0644 "$SCRIPT_DIR/nginx/commonground-gateway.conf" "$NGINX_SITE_AVAILABLE"
    ln -sf "$NGINX_SITE_AVAILABLE" "$NGINX_SITE_ENABLED"

    if [[ -L /etc/nginx/sites-enabled/default ]]; then
        note "Disabling stock default site"
        rm -f /etc/nginx/sites-enabled/default
    fi

    # ACME challenge webroot (used by Let's Encrypt later).
    mkdir -p /var/www/letsencrypt
    chown www-data:www-data /var/www/letsencrypt

    note "Validating NGINX config"
    nginx -t
    systemctl reload nginx
}

# ----------------------------------------------------------------------------
# 4. Ingestor service
# ----------------------------------------------------------------------------
install_ingestor() {
    step "Installing Node ingestor as systemd service"

    if ! id -u "$INGESTOR_USER" &>/dev/null; then
        note "Creating $INGESTOR_USER service user"
        useradd --system --home "$INGESTOR_HOME" --shell /usr/sbin/nologin "$INGESTOR_USER"
    fi
    install -d -o "$INGESTOR_USER" -g "$INGESTOR_USER" "$INGESTOR_HOME"

    # Sync the ingestor + server.js into the service home. Symlinks would
    # work too but a copy survives if the repo is later moved.
    install -m 0644 -o "$INGESTOR_USER" -g "$INGESTOR_USER" \
        "$REPO_ROOT/telemetryIngestor.js" \
        "$INGESTOR_HOME/telemetryIngestor.js"
    install -m 0644 -o "$INGESTOR_USER" -g "$INGESTOR_USER" \
        "$REPO_ROOT/gateway/server.js" \
        "$INGESTOR_HOME/server.js"

    # Node deps. Installs into the service home so the service user owns them.
    if [[ ! -f "$INGESTOR_HOME/package.json" ]]; then
        cat > "$INGESTOR_HOME/package.json" <<EOF
{
  "name": "commonground-ingestor",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "express": "^4.21.0"
  }
}
EOF
        chown "$INGESTOR_USER:$INGESTOR_USER" "$INGESTOR_HOME/package.json"
    fi
    sudo -u "$INGESTOR_USER" bash -c "cd '$INGESTOR_HOME' && npm install --omit=dev --no-audit --no-fund"

    # Environment file — operator fills these in manually after install.
    if [[ ! -f /etc/commonground-ingestor.env ]]; then
        cat > /etc/commonground-ingestor.env <<'EOF'
# CommonGround edge ingestor configuration.
# Owner: root.  Mode: 0600.
# These are SENSITIVE — never commit to git.
SUPABASE_URL=https://omtjnkjqjkfwhaxbyfvb.supabase.co
SUPABASE_SERVICE_ROLE_KEY=replace-with-service-role-key
PORT=3017
EOF
        chmod 0600 /etc/commonground-ingestor.env
        note "Wrote /etc/commonground-ingestor.env — EDIT IT before starting the service"
    fi

    # systemd unit.
    cat > /etc/systemd/system/commonground-ingestor.service <<EOF
[Unit]
Description=CommonGround Edge Telemetry Ingestor
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$INGESTOR_USER
Group=$INGESTOR_USER
WorkingDirectory=$INGESTOR_HOME
EnvironmentFile=/etc/commonground-ingestor.env
ExecStart=/usr/bin/node $INGESTOR_HOME/server.js
Restart=on-failure
RestartSec=5
NoNewPrivileges=true
ProtectSystem=strict
ProtectHome=true
PrivateTmp=true
ReadWritePaths=$INGESTOR_HOME
CapabilityBoundingSet=
AmbientCapabilities=

[Install]
WantedBy=multi-user.target
EOF

    systemctl daemon-reload
    systemctl enable commonground-ingestor.service

    if grep -q "replace-with-service-role-key" /etc/commonground-ingestor.env; then
        note "NOT starting service — fill in SUPABASE_SERVICE_ROLE_KEY first."
        note "Then:  sudo systemctl start commonground-ingestor"
    else
        systemctl restart commonground-ingestor.service
        note "Ingestor restarted"
    fi
}

# ----------------------------------------------------------------------------
# Main
# ----------------------------------------------------------------------------
require_root
install_packages
provision_tls
install_nginx_site
install_ingestor

step "Done."
cat <<EOF

Next steps:
  1. Edit  /etc/commonground-ingestor.env  and paste your Supabase
     service-role key.
  2. sudo systemctl start commonground-ingestor
  3. Trust the self-signed cert on first ESP32 provision (the firmware uses
     client.setInsecure() by default for closed networks; switch to
     setCACert() with the real CA chain when you move to Let's Encrypt).
  4. Pair a sensor:
        screen /dev/ttyUSB0 115200
        > set-node-id Node-G02
        > set-secret  <64-hex generated by service-role tooling>
        > set-wifi    OurFarm  hunterpass
        > set-url     https://$HOSTNAME_CG/api/v1/telemetry/gate-state
        > commit

EOF
