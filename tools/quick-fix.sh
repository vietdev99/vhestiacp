#!/bin/bash
#==========================================================================
# VHestiaCP Quick Fix Script
# Run this on servers that were installed before the latest updates
#==========================================================================

echo "=============================================="
echo "VHestiaCP Quick Fix Script"
echo "=============================================="
echo ""

HESTIA="/usr/local/hestia"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "Error: This script must be run as root"
   exit 1
fi

# Check if Hestia is installed
if [ ! -d "$HESTIA" ]; then
   echo "Error: Hestia is not installed"
   exit 1
fi

echo "[1/4] Fixing sudoers for hestiaweb..."
cat > /etc/sudoers.d/hestiaweb << 'EOF'
Defaults:root !requiretty

# sudo is limited to hestia scripts
hestiaweb   ALL=NOPASSWD:/usr/local/hestia/bin/*

# VHestiaCP: Allow service management for extended services
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl reload-or-restart haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl reload haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart redis-server
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart rabbitmq-server
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart kafka
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart mongod
EOF
chmod 440 /etc/sudoers.d/hestiaweb
echo "    ✓ Sudoers updated"

echo ""
echo "[2/4] Creating v-update-sys-haproxy-config script..."
cat > "$HESTIA/bin/v-update-sys-haproxy-config" << 'SCRIPT'
#!/bin/bash
# info: update HAProxy configuration
# options: CONFIG_FILE
#
# example: v-update-sys-haproxy-config /tmp/haproxy_config_temp
#
# This function updates HAProxy configuration and restarts the service

#----------------------------------------------------------#
#                Variables & Functions                     #
#----------------------------------------------------------#

config_input=$1

# Includes
source /etc/hestiacp/hestia.conf
source $HESTIA/func/main.sh
source_conf "$HESTIA/conf/hestia.conf"

#----------------------------------------------------------#
#                    Verifications                         #
#----------------------------------------------------------#

check_args '1' "$#" 'CONFIG_FILE'

# Check if input file exists
if [ ! -f "$config_input" ]; then
    echo "Error: Input config file not found"
    exit 1
fi

# Check if HAProxy is installed
if [ ! -f "/etc/haproxy/haproxy.cfg" ]; then
    echo "Error: HAProxy is not installed"
    exit 1
fi

#----------------------------------------------------------#
#                       Action                             #
#----------------------------------------------------------#

# Validate the new configuration
haproxy -c -f "$config_input" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Invalid HAProxy configuration"
    exit 1
fi

# Backup current config
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak

# Apply new config
cp "$config_input" /etc/haproxy/haproxy.cfg
chmod 644 /etc/haproxy/haproxy.cfg

# Reload HAProxy
systemctl reload-or-restart haproxy
if [ $? -ne 0 ]; then
    # Restore backup on failure
    cp /etc/haproxy/haproxy.cfg.bak /etc/haproxy/haproxy.cfg
    systemctl restart haproxy
    echo "Error: HAProxy failed to restart. Previous config restored."
    exit 1
fi

#----------------------------------------------------------#
#                       Hestia                             #
#----------------------------------------------------------#

# Logging
$HESTIA/bin/v-log-action "system" "Info" "HAProxy" "Configuration updated"

exit 0
SCRIPT
chmod +x "$HESTIA/bin/v-update-sys-haproxy-config"
echo "    ✓ v-update-sys-haproxy-config created"

echo ""
echo "[3/4] Updating hestia.conf with missing variables..."

# Add missing config variables
config_file="$HESTIA/conf/hestia.conf"

# Check and add RabbitMQ if service is running
if systemctl is-active --quiet rabbitmq-server 2>/dev/null; then
    grep -q "RABBITMQ_SYSTEM" "$config_file" || echo "RABBITMQ_SYSTEM='yes'" >> "$config_file"
    echo "    ✓ Added RABBITMQ_SYSTEM"
fi

# Check and add Kafka if service is running
if systemctl is-active --quiet kafka 2>/dev/null; then
    grep -q "KAFKA_SYSTEM" "$config_file" || echo "KAFKA_SYSTEM='yes'" >> "$config_file"
    echo "    ✓ Added KAFKA_SYSTEM"
fi

# Check and add Redis if service is running
if systemctl is-active --quiet redis-server 2>/dev/null; then
    grep -q "REDIS_SYSTEM" "$config_file" || echo "REDIS_SYSTEM='yes'" >> "$config_file"
    echo "    ✓ Added REDIS_SYSTEM"
fi

# Check and add HAProxy if service is running
if systemctl is-active --quiet haproxy 2>/dev/null; then
    grep -q "HAPROXY_SYSTEM" "$config_file" || echo "HAPROXY_SYSTEM='yes'" >> "$config_file"
    echo "    ✓ Added HAPROXY_SYSTEM"
fi

# Check and add MongoDB if service is running
if systemctl is-active --quiet mongod 2>/dev/null; then
    grep -q "MONGODB_SYSTEM" "$config_file" || echo "MONGODB_SYSTEM='yes'" >> "$config_file"
    echo "    ✓ Added MONGODB_SYSTEM"
fi

echo ""
echo "[4/4] Restarting Hestia services..."
systemctl restart hestia > /dev/null 2>&1
echo "    ✓ Hestia restarted"

echo ""
echo "=============================================="
echo "✅ Quick fix completed!"
echo ""
echo "IMPORTANT: Please logout and login again"
echo "to the admin panel for changes to take effect."
echo "=============================================="
