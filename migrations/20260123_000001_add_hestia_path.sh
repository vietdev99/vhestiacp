#!/bin/bash
# Migration: Add HESTIA path to vhestia config
# Description: Ensures /etc/vhestia/hestia.conf exists and contains HESTIA variable
# Date: 2026-01-23
#
# What this migration does:
# - Creates /etc/vhestia directory if not exists
# - Copies config from /usr/local/hestia/conf/hestia.conf if not exists
# - Adds HESTIA='/usr/local/hestia' if not present

HESTIA_PATH="${HESTIA:-/usr/local/hestia}"
VHESTIA_CONF="/etc/vhestia/hestia.conf"

echo "Ensuring VHestiaCP configuration exists..."

# Create /etc/vhestia directory if not exists
if [ ! -d "/etc/vhestia" ]; then
    echo "Creating /etc/vhestia directory..."
    mkdir -p /etc/vhestia
fi

# Create config file if not exists
if [ ! -f "$VHESTIA_CONF" ]; then
    echo "Creating $VHESTIA_CONF..."
    # Copy from main hestia.conf if exists
    if [ -f "$HESTIA_PATH/conf/hestia.conf" ]; then
        cp "$HESTIA_PATH/conf/hestia.conf" "$VHESTIA_CONF"
    else
        touch "$VHESTIA_CONF"
    fi
fi

# Add HESTIA variable if not present
if ! grep -q "^HESTIA=" "$VHESTIA_CONF" 2>/dev/null; then
    echo "Adding HESTIA path to config..."
    echo "HESTIA='$HESTIA_PATH'" >> "$VHESTIA_CONF"
    echo "HESTIA path added: $HESTIA_PATH"
else
    echo "HESTIA path already configured"
fi

# Verify
if grep -q "^HESTIA=" "$VHESTIA_CONF"; then
    echo "Migration completed successfully"
else
    echo "Warning: Failed to add HESTIA path"
    exit 1
fi

exit 0
