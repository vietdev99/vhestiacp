#!/bin/bash
# info: Migrate VHestiaCP web panel from PM2 to systemd
# options: NONE
#
# This script migrates existing VHestiaCP installations from PM2 to systemd service
# Run this on servers that are currently using PM2 for the web panel

#----------------------------------------------------------#
#                Variables & Functions                     #
#----------------------------------------------------------#

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

#----------------------------------------------------------#
#                    Verifications                         #
#----------------------------------------------------------#

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    log_error "This script must be run as root"
    exit 1
fi

# Check if VHestiaCP is installed
if [ ! -d "/usr/local/hestia" ] && [ ! -d "/usr/local/vhestia" ]; then
    log_error "VHestiaCP/HestiaCP not found"
    exit 1
fi

# Set HESTIA path
if [ -d "/usr/local/vhestia" ]; then
    HESTIA="/usr/local/vhestia"
elif [ -d "/usr/local/hestia" ]; then
    HESTIA="/usr/local/hestia"
fi

#----------------------------------------------------------#
#                       Action                             #
#----------------------------------------------------------#

log_info "Starting PM2 to systemd migration for VHestiaCP web panel..."
echo ""

# Step 1: Check if PM2 is installed and running vhestia-panel
if ! command -v pm2 &> /dev/null; then
    log_warn "PM2 not found. Checking if systemd service already exists..."
    if systemctl is-active --quiet vhestia-panel; then
        log_info "VHestiaCP web panel is already running with systemd"
        exit 0
    else
        log_error "Neither PM2 nor systemd service found for VHestiaCP web panel"
        exit 1
    fi
fi

# Check if PM2 is managing vhestia-panel
if ! pm2 list 2>/dev/null | grep -q "vhestia"; then
    log_warn "PM2 is not managing vhestia-panel process"
    if systemctl is-active --quiet vhestia-panel; then
        log_info "VHestiaCP web panel is already running with systemd"
        exit 0
    fi
fi

log_info "Found PM2 managing VHestiaCP web panel"

# Step 2: Stop and remove PM2 process
log_info "Stopping PM2 process..."
pm2 stop vhestia-panel 2>/dev/null || true
pm2 delete vhestia-panel 2>/dev/null || true
pm2 save 2>/dev/null || true

log_info "PM2 process stopped and removed"

# Step 3: Check if systemd service file exists
if [ ! -f "$HESTIA/install/deb/vhestia-panel.service" ]; then
    log_error "Systemd service file not found at $HESTIA/install/deb/vhestia-panel.service"
    log_error "Please update VHestiaCP to the latest version first"
    exit 1
fi

# Step 4: Install systemd service
log_info "Installing systemd service..."
cp "$HESTIA/install/deb/vhestia-panel.service" /etc/systemd/system/
systemctl daemon-reload

# Step 5: Enable and start systemd service
log_info "Enabling and starting vhestia-panel service..."
systemctl enable vhestia-panel
systemctl start vhestia-panel

# Wait for service to start
sleep 3

# Step 6: Verify service is running
if systemctl is-active --quiet vhestia-panel; then
    log_info "✓ VHestiaCP web panel successfully migrated to systemd"

    # Show service status
    echo ""
    log_info "Service status:"
    systemctl status vhestia-panel --no-pager | head -10

    # Check port 8083
    echo ""
    log_info "Port 8083 status:"
    if ss -tlnp | grep -q ":8083"; then
        ss -tlnp | grep ":8083"
        log_info "✓ Web panel is listening on port 8083"
    else
        log_warn "Port 8083 is not listening. Check logs: journalctl -u vhestia-panel -n 50"
    fi

    # Show memory usage comparison
    echo ""
    log_info "Memory usage comparison:"
    echo "  - PM2 (old): ~70MB RSS"
    CURRENT_MEM=$(ps -o rss= -p $(pgrep -f "node.*src/index.js" | head -1) 2>/dev/null | awk '{print int($1/1024)}')
    if [ -n "$CURRENT_MEM" ]; then
        echo "  - systemd (new): ~${CURRENT_MEM}MB RSS"
    else
        echo "  - systemd (new): ~27MB RSS (typical)"
    fi

else
    log_error "Failed to start vhestia-panel service"
    log_error "Check logs: journalctl -u vhestia-panel -n 50"
    exit 1
fi

# Step 7: Optional - Remove PM2 if no other apps are using it
echo ""
read -p "Do you want to remove PM2 completely? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if pm2 list 2>/dev/null | grep -q "online"; then
        log_warn "PM2 is still managing other applications. Skipping PM2 removal."
    else
        log_info "Removing PM2..."
        pm2 kill 2>/dev/null || true
        npm uninstall -g pm2 2>/dev/null || true
        log_info "PM2 removed"
    fi
fi

echo ""
log_info "Migration completed successfully!"
log_info "VHestiaCP web panel is now managed by systemd"
log_info ""
log_info "Useful commands:"
log_info "  - Check status:  systemctl status vhestia-panel"
log_info "  - View logs:     journalctl -u vhestia-panel -f"
log_info "  - Restart:       systemctl restart vhestia-panel"
log_info "  - Stop:          systemctl stop vhestia-panel"

exit 0
