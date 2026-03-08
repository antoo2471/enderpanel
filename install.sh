#!/bin/bash
set -e

PANEL_DIR="/opt/enderpanel"
PANEL_USER="enderpanel"
PANEL_REPO="https://github.com/enderpanel/enderpanel"
NODE_MIN_VERSION=18
WEB_PORT=9172
API_PORT=31357
SFTP_PORT=8382

RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log() { echo -e "${GREEN}[EnderPanel]${NC} $1"; }
err() { echo -e "${RED}[Error]${NC} $1"; exit 1; }
info() { echo -e "${BLUE}[Info]${NC} $1"; }

echo ""
echo "  ======================================"
echo "       ENDERPANEL INSTALLER"
echo "       Minecraft Server Management"
echo "  ======================================"
echo ""

if [ "$(id -u)" -ne 0 ]; then
    err "This script must be run as root (sudo)"
fi

if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    err "This installer only supports Linux"
fi

log "Checking dependencies..."

if ! command -v node &> /dev/null; then
    info "Node.js not found. Installing Node.js 20 LTS..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

NODE_VERSION=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt "$NODE_MIN_VERSION" ]; then
    err "Node.js $NODE_MIN_VERSION+ required (found v$NODE_VERSION)"
fi
log "Node.js $(node -v) OK"

if ! command -v java &> /dev/null; then
    info "Java not found. Installing OpenJDK 21..."
    apt-get install -y openjdk-21-jre-headless
fi
log "Java $(java -version 2>&1 | head -1) OK"

if ! command -v git &> /dev/null; then
    apt-get install -y git
fi

if ! id "$PANEL_USER" &> /dev/null; then
    log "Creating system user $PANEL_USER..."
    useradd -r -m -d "$PANEL_DIR" -s /bin/bash "$PANEL_USER"
fi

if [ -d "$PANEL_DIR/.git" ]; then
    log "Updating existing installation..."
    cd "$PANEL_DIR"
    sudo -u "$PANEL_USER" git pull
else
    log "Downloading EnderPanel..."
    mkdir -p "$PANEL_DIR"
    if [ -d "$PANEL_DIR" ] && [ "$(ls -A $PANEL_DIR 2>/dev/null)" ]; then
        cp -r . "$PANEL_DIR/" 2>/dev/null || true
    fi
    chown -R "$PANEL_USER:$PANEL_USER" "$PANEL_DIR"
fi

cd "$PANEL_DIR"

log "Installing backend dependencies..."
cd backend
sudo -u "$PANEL_USER" npm install --production
cd ..

log "Installing frontend dependencies..."
cd frontend
sudo -u "$PANEL_USER" npm install
log "Building frontend..."
sudo -u "$PANEL_USER" npm run build
cd ..

mkdir -p "$PANEL_DIR/backend/data/servers"
mkdir -p "$PANEL_DIR/backend/data/backups"
mkdir -p "$PANEL_DIR/backend/data/keys"
chown -R "$PANEL_USER:$PANEL_USER" "$PANEL_DIR"

log "Setting up SystemD service..."
cat > /etc/systemd/system/enderpanel.service << EOF
[Unit]
Description=EnderPanel - Minecraft Server Management
After=network.target

[Service]
Type=simple
User=$PANEL_USER
WorkingDirectory=$PANEL_DIR/backend
ExecStart=/usr/bin/node src/index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production
Environment=PORT=$API_PORT
Environment=HOST=0.0.0.0
Environment=SFTP_PORT=$SFTP_PORT

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable enderpanel
systemctl restart enderpanel

if command -v avahi-daemon &> /dev/null; then
    log "Configuring mDNS (enderpanel.local)..."
    cat > /etc/avahi/services/enderpanel.service << EOF
<?xml version="1.0" standalone='no'?>
<!DOCTYPE service-group SYSTEM "avahi-service.dtd">
<service-group>
  <name>EnderPanel</name>
  <service>
    <type>_http._tcp</type>
    <port>$WEB_PORT</port>
  </service>
</service-group>
EOF
    systemctl restart avahi-daemon
    log "mDNS configured: http://enderpanel.local:$WEB_PORT"
else
    info "avahi-daemon not found. Install avahi-daemon for mDNS support."
    info "  apt-get install avahi-daemon"
fi

echo ""
log "======================================"
log "  EnderPanel installed successfully!"
log "======================================"
echo ""
info "Web Interface : http://$(hostname -I | awk '{print $1}'):$WEB_PORT"
info "API (internal): http://127.0.0.1:$API_PORT"
info "SFTP          : port $SFTP_PORT"
info "Login         : admin / admin"
echo ""
info "Service commands:"
info "  systemctl status enderpanel"
info "  systemctl restart enderpanel"
info "  journalctl -u enderpanel -f"
echo ""
log "IMPORTANT: Change the default admin password!"
echo ""
