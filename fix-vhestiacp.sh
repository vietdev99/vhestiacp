#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP - Complete Fix Script                                  #
#          Fixes HAProxy, MongoDB, and Web Panel                            #
#                                                                           #
#===========================================================================#

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo "========================================================================"
echo "                    VHestiaCP Complete Fix Script                       "
echo "========================================================================"
echo ""

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo -e "${RED}Error: This script must be run as root${NC}"
    exit 1
fi

HESTIA="/usr/local/hestia"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#----------------------------------------------------------#
#                     Step 1: Fix HAProxy                  #
#----------------------------------------------------------#

echo -e "${BLUE}[1/5] Fixing HAProxy...${NC}"

if dpkg -l 2>/dev/null | grep -q "^ii.*haproxy"; then
    echo "  - HAProxy package is installed"
    
    # Create directories
    mkdir -p /etc/haproxy/certs
    mkdir -p /etc/haproxy/conf.d
    mkdir -p /var/run/haproxy
    
    # Check if SSL cert exists
    if [ ! -f /etc/haproxy/certs/default.pem ]; then
        echo "  - Creating default SSL certificate..."
        openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
            -keyout /tmp/default.key \
            -out /tmp/default.crt \
            -subj "/C=US/ST=State/L=City/O=VHestiaCP/CN=localhost" 2>/dev/null
        cat /tmp/default.crt /tmp/default.key > /etc/haproxy/certs/default.pem
        rm -f /tmp/default.crt /tmp/default.key
        chmod 600 /etc/haproxy/certs/default.pem
        echo -e "    ${GREEN}✓ SSL certificate created${NC}"
    else
        echo -e "    ${GREEN}✓ SSL certificate exists${NC}"
    fi
    
    # Fix HAProxy config if needed - update SSL cert path
    if [ -f /etc/haproxy/haproxy.cfg ]; then
        if grep -q "crt /etc/haproxy/certs/ " /etc/haproxy/haproxy.cfg 2>/dev/null; then
            echo "  - Fixing HAProxy SSL config path..."
            sed -i 's|crt /etc/haproxy/certs/ |crt /etc/haproxy/certs/default.pem |g' /etc/haproxy/haproxy.cfg
            echo -e "    ${GREEN}✓ SSL config path fixed${NC}"
        fi
        
        # Check if stats section exists
        if ! grep -q "listen stats" /etc/haproxy/haproxy.cfg 2>/dev/null; then
            echo "  - Adding stats section to config..."
            cat >> /etc/haproxy/haproxy.cfg << 'STATSEOF'

listen stats
    bind *:8404
    mode http
    stats enable
    stats hide-version
    stats realm HAProxy\ Statistics
    stats uri /stats
    stats auth admin:admin
    stats refresh 30s
    stats admin if TRUE
STATSEOF
            echo -e "    ${GREEN}✓ Stats section added${NC}"
        fi
    else
        echo "  - Creating HAProxy config..."
        cat > /etc/haproxy/haproxy.cfg << 'HAPROXYEOF'
global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /var/run/haproxy/admin.sock mode 660 level admin
    stats timeout 30s
    user haproxy
    group haproxy
    daemon

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    timeout connect 5000
    timeout client  50000
    timeout server  50000

listen stats
    bind *:8404
    mode http
    stats enable
    stats hide-version
    stats realm HAProxy\ Statistics
    stats uri /stats
    stats auth admin:admin
    stats refresh 30s
    stats admin if TRUE

frontend http_front
    bind *:80
    mode http
    default_backend default_backend

backend default_backend
    mode http
    balance roundrobin
    server nginx1 127.0.0.1:8080 check
HAPROXYEOF
        echo -e "    ${GREEN}✓ HAProxy config created${NC}"
    fi
    
    # Validate config
    echo "  - Validating HAProxy config..."
    if haproxy -c -f /etc/haproxy/haproxy.cfg > /dev/null 2>&1; then
        echo -e "    ${GREEN}✓ Config is valid${NC}"
        
        # Restart HAProxy
        echo "  - Starting HAProxy service..."
        systemctl enable haproxy > /dev/null 2>&1
        systemctl restart haproxy
        sleep 2
        
        if systemctl is-active --quiet haproxy; then
            echo -e "    ${GREEN}✓ HAProxy is running${NC}"
        else
            echo -e "    ${RED}✗ HAProxy failed to start${NC}"
            systemctl status haproxy --no-pager | head -10
        fi
    else
        echo -e "    ${RED}✗ Config validation failed:${NC}"
        haproxy -c -f /etc/haproxy/haproxy.cfg
    fi
    
    # Add firewall rule
    echo "  - Adding firewall rule for port 8404..."
    iptables -C INPUT -p tcp --dport 8404 -j ACCEPT 2>/dev/null || \
        iptables -I INPUT -p tcp --dport 8404 -j ACCEPT
    echo -e "    ${GREEN}✓ Firewall rule added${NC}"
    
else
    echo -e "  ${YELLOW}HAProxy is not installed, skipping...${NC}"
fi

#----------------------------------------------------------#
#                     Step 2: Fix MongoDB                  #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[2/5] Fixing MongoDB...${NC}"

# Detect Ubuntu version
ubuntu_codename=$(lsb_release -cs 2>/dev/null || echo "noble")
echo "  - Ubuntu codename: $ubuntu_codename"

# MongoDB 7.0 doesn't support Ubuntu 24.04, use 8.0
if [ "$ubuntu_codename" = "noble" ]; then
    mongodb_version="8.0"
    echo "  - Ubuntu 24.04 detected, using MongoDB 8.0"
else
    mongodb_version="7.0"
fi

if ! command -v mongod &> /dev/null; then
    echo "  - MongoDB is not installed, installing now..."
    
    # Remove old repo if exists
    rm -f /etc/apt/sources.list.d/mongodb-org-*.list
    
    # Add GPG key
    echo "  - Adding MongoDB GPG key..."
    curl -fsSL "https://www.mongodb.org/static/pgp/server-${mongodb_version}.asc" 2>/dev/null | \
        gpg --dearmor --yes -o "/usr/share/keyrings/mongodb-server-${mongodb_version}.gpg" 2>/dev/null
    
    if [ ! -f "/usr/share/keyrings/mongodb-server-${mongodb_version}.gpg" ]; then
        echo -e "    ${RED}✗ Failed to download MongoDB GPG key${NC}"
    else
        echo -e "    ${GREEN}✓ GPG key added${NC}"
        
        # Add repository
        echo "  - Adding MongoDB repository..."
        echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${mongodb_version}.gpg ] https://repo.mongodb.org/apt/ubuntu ${ubuntu_codename}/mongodb-org/${mongodb_version} multiverse" > "/etc/apt/sources.list.d/mongodb-org-${mongodb_version}.list"
        echo -e "    ${GREEN}✓ Repository added${NC}"
        
        # Update and install
        echo "  - Installing MongoDB packages (this may take a while)..."
        apt-get update -qq 2>&1 | grep -E "mongodb|Err:" || true
        DEBIAN_FRONTEND=noninteractive apt-get install -y mongodb-org 2>&1 | tail -5
        
        if command -v mongod &> /dev/null; then
            echo -e "    ${GREEN}✓ MongoDB installed${NC}"
        else
            echo -e "    ${RED}✗ MongoDB installation failed${NC}"
        fi
    fi
fi

if command -v mongod &> /dev/null; then
    echo "  - MongoDB version: $(mongod --version 2>&1 | head -1)"
    
    # Create config if not exists
    if [ ! -f /etc/mongod.conf ]; then
        echo "  - Creating MongoDB config..."
        cat > /etc/mongod.conf << 'MONGOCONF'
storage:
  dbPath: /var/lib/mongodb
  journal:
    enabled: true

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
MONGOCONF
        echo -e "    ${GREEN}✓ Config created${NC}"
    fi
    
    # Create directories
    mkdir -p /var/lib/mongodb /var/log/mongodb
    chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb 2>/dev/null || true
    
    # Start MongoDB
    echo "  - Starting MongoDB service..."
    systemctl daemon-reload
    systemctl enable mongod > /dev/null 2>&1
    systemctl restart mongod
    sleep 3
    
    if systemctl is-active --quiet mongod; then
        echo -e "    ${GREEN}✓ MongoDB is running${NC}"
    else
        echo -e "    ${RED}✗ MongoDB failed to start${NC}"
        systemctl status mongod --no-pager | head -10
    fi
    
    # Update hestia.conf
    sed -i "s/MONGODB_VERSION='7.0'/MONGODB_VERSION='${mongodb_version}'/" "$HESTIA/conf/hestia.conf" 2>/dev/null
fi

#----------------------------------------------------------#
#                     Step 3: Fix hestia.conf              #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[3/5] Fixing hestia.conf...${NC}"

hestia_conf="$HESTIA/conf/hestia.conf"

if [ -f "$hestia_conf" ]; then
    # Ensure VHestiaCP settings exist
    declare -A settings=(
        ["HAPROXY_SYSTEM"]="yes"
        ["HAPROXY_STATS"]="yes"
        ["HAPROXY_STATS_PORT"]="8404"
        ["HAPROXY_STATS_USER"]="admin"
        ["MONGODB_SYSTEM"]="yes"
        ["MONGODB_VERSION"]="$mongodb_version"
        ["NODEJS_SYSTEM"]="yes"
        ["PYTHON_SYSTEM"]="yes"
        ["VHESTIACP_VERSION"]="1.0.0"
    )
    
    for key in "${!settings[@]}"; do
        value="${settings[$key]}"
        if grep -q "^${key}=" "$hestia_conf"; then
            # Update existing
            sed -i "s/^${key}=.*/${key}='${value}'/" "$hestia_conf"
            echo -e "  ${GREEN}✓${NC} Updated: ${key}='${value}'"
        else
            # Add new
            echo "${key}='${value}'" >> "$hestia_conf"
            echo -e "  ${GREEN}✓${NC} Added: ${key}='${value}'"
        fi
    done
else
    echo -e "  ${RED}✗ hestia.conf not found${NC}"
fi

#----------------------------------------------------------#
#                     Step 4: Fix Web Panel Files          #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[4/6] Fixing Web Panel Files...${NC}"

# Check if we have VHestiaCP web files
if [ -d "$SCRIPT_DIR/web" ]; then
    echo "  - Found VHestiaCP web files in $SCRIPT_DIR"
    
    # Create directories
    echo "  - Creating web directories..."
    mkdir -p $HESTIA/web/list/{mongodb,nodejs,python,haproxy}
    mkdir -p $HESTIA/web/add/{mongodb,nodejs,python}
    mkdir -p $HESTIA/web/edit/{mongodb,nodejs,python,haproxy}
    mkdir -p $HESTIA/web/delete/{mongodb,nodejs,python}
    mkdir -p $HESTIA/web/{start,stop,restart}/{nodejs,python}
    
    # Copy panel.php (CRITICAL - contains navigation tabs)
    if [ -f "$SCRIPT_DIR/web/templates/includes/panel.php" ]; then
        cp -f "$SCRIPT_DIR/web/templates/includes/panel.php" "$HESTIA/web/templates/includes/panel.php"
        echo -e "    ${GREEN}✓${NC} panel.php copied"
        
        # Verify
        if grep -q "MONGODB_SYSTEM" "$HESTIA/web/templates/includes/panel.php"; then
            echo -e "    ${GREEN}✓${NC} Verified: VHestiaCP tabs present in panel.php"
        else
            echo -e "    ${RED}✗${NC} Warning: VHestiaCP tabs not found!"
        fi
    else
        echo -e "    ${RED}✗${NC} panel.php not found in source"
    fi
    
    # Copy list_services.php
    if [ -f "$SCRIPT_DIR/web/templates/pages/list_services.php" ]; then
        cp -f "$SCRIPT_DIR/web/templates/pages/list_services.php" "$HESTIA/web/templates/pages/list_services.php"
        echo -e "    ${GREEN}✓${NC} list_services.php copied"
    fi
    
    # Copy ALL template pages (list, add, edit)
    echo "  - Copying template pages..."
    for page in list_mongodb list_nodejs list_python list_haproxy add_mongodb add_nodejs add_python edit_mongodb edit_nodejs edit_python; do
        if [ -f "$SCRIPT_DIR/web/templates/pages/${page}.php" ]; then
            cp -f "$SCRIPT_DIR/web/templates/pages/${page}.php" "$HESTIA/web/templates/pages/"
            echo -e "    ${GREEN}✓${NC} ${page}.php"
        fi
    done
    
    # Copy list controllers
    echo "  - Copying list controllers..."
    for dir in mongodb nodejs python haproxy; do
        if [ -f "$SCRIPT_DIR/web/list/${dir}/index.php" ]; then
            cp -f "$SCRIPT_DIR/web/list/${dir}/index.php" "$HESTIA/web/list/${dir}/"
            echo -e "    ${GREEN}✓${NC} list/${dir}/index.php"
        fi
    done
    
    # Copy add/edit controllers
    echo "  - Copying add/edit controllers..."
    for action in add edit; do
        for app in mongodb nodejs python; do
            if [ -f "$SCRIPT_DIR/web/${action}/${app}/index.php" ]; then
                mkdir -p "$HESTIA/web/${action}/${app}"
                cp -f "$SCRIPT_DIR/web/${action}/${app}/index.php" "$HESTIA/web/${action}/${app}/"
                echo -e "    ${GREEN}✓${NC} ${action}/${app}/index.php"
            fi
        done
    done
    
    # Copy action controllers (start/stop/restart/delete)
    echo "  - Copying action controllers..."
    for action in start stop restart delete; do
        for app in nodejs python mongodb; do
            if [ -f "$SCRIPT_DIR/web/${action}/${app}/index.php" ]; then
                mkdir -p "$HESTIA/web/${action}/${app}"
                cp -f "$SCRIPT_DIR/web/${action}/${app}/index.php" "$HESTIA/web/${action}/${app}/"
            fi
        done
    done
    echo -e "    ${GREEN}✓${NC} Action controllers copied"
    
else
    echo -e "  ${RED}✗${NC} VHestiaCP web files not found in $SCRIPT_DIR"
    echo "     Please ensure you're running this from the vhestiacp-full directory"
fi

#----------------------------------------------------------#
#                     Step 5: Fix v-list-sys-config        #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[5/6] Fixing v-list-sys-config...${NC}"

CONFIG_FILE="$HESTIA/bin/v-list-sys-config"

# Check if already patched
if grep -q "MONGODB_SYSTEM" "$CONFIG_FILE" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} v-list-sys-config already patched"
else
    echo "  - Patching v-list-sys-config to include VHestiaCP variables..."
    
    # Backup
    cp "$CONFIG_FILE" "${CONFIG_FILE}.bak"
    
    # Use Python for reliable text replacement
    python3 << 'PYEOF'
config_file = "/usr/local/hestia/bin/v-list-sys-config"

with open(config_file, 'r') as f:
    content = f.read()

old_line = '"WEB_TERMINAL_PORT": "\'$WEB_TERMINAL_PORT\'"'
new_lines = '''"WEB_TERMINAL_PORT": "'$WEB_TERMINAL_PORT'",
			"HAPROXY_SYSTEM": "'$HAPROXY_SYSTEM'",
			"HAPROXY_STATS": "'$HAPROXY_STATS'",
			"HAPROXY_STATS_PORT": "'$HAPROXY_STATS_PORT'",
			"HAPROXY_STATS_USER": "'$HAPROXY_STATS_USER'",
			"MONGODB_SYSTEM": "'$MONGODB_SYSTEM'",
			"MONGODB_VERSION": "'$MONGODB_VERSION'",
			"NODEJS_SYSTEM": "'$NODEJS_SYSTEM'",
			"NODEJS_VERSIONS": "'$NODEJS_VERSIONS'",
			"NODEJS_DEFAULT": "'$NODEJS_DEFAULT'",
			"PYTHON_SYSTEM": "'$PYTHON_SYSTEM'",
			"PYTHON_VERSIONS": "'$PYTHON_VERSIONS'",
			"VHESTIACP_VERSION": "'$VHESTIACP_VERSION'"'''

if old_line in content:
    content = content.replace(old_line, new_lines)
    with open(config_file, 'w') as f:
        f.write(content)
    print("  ✓ Patched successfully!")
else:
    print("  ✗ Could not find target line (may already be patched)")
PYEOF
    
    # Verify
    if grep -q "MONGODB_SYSTEM" "$CONFIG_FILE"; then
        echo -e "  ${GREEN}✓${NC} v-list-sys-config patched successfully"
    else
        echo -e "  ${RED}✗${NC} Patch failed"
    fi
fi

#----------------------------------------------------------#
#                     Step 6: Restart Services             #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[6/6] Restarting Services...${NC}"

# Restart Hestia
echo "  - Restarting Hestia service..."
systemctl restart hestia > /dev/null 2>&1 || true
echo -e "    ${GREEN}✓${NC} Hestia restarted"

#----------------------------------------------------------#
#                     Summary                              #
#----------------------------------------------------------#

echo ""
echo "========================================================================"
echo "                              SUMMARY                                   "
echo "========================================================================"
echo ""

# Service status
echo "Service Status:"
printf "  - HAProxy:  "
if systemctl is-active --quiet haproxy 2>/dev/null; then
    echo -e "${GREEN}running${NC}"
else
    echo -e "${RED}stopped${NC}"
fi

printf "  - MongoDB:  "
if systemctl is-active --quiet mongod 2>/dev/null; then
    echo -e "${GREEN}running${NC}"
else
    echo -e "${RED}stopped${NC}"
fi

printf "  - Nginx:    "
if systemctl is-active --quiet nginx 2>/dev/null; then
    echo -e "${GREEN}running${NC}"
else
    echo -e "${RED}stopped${NC}"
fi

printf "  - Hestia:   "
if systemctl is-active --quiet hestia 2>/dev/null; then
    echo -e "${GREEN}running${NC}"
else
    echo -e "${RED}stopped${NC}"
fi

# Port check
echo ""
echo "Port Status:"
printf "  - Port 8404 (HAProxy Stats): "
if ss -tlnp 2>/dev/null | grep -q ":8404"; then
    echo -e "${GREEN}listening${NC}"
else
    echo -e "${RED}not listening${NC}"
fi

printf "  - Port 27017 (MongoDB):      "
if ss -tlnp 2>/dev/null | grep -q ":27017"; then
    echo -e "${GREEN}listening${NC}"
else
    echo -e "${RED}not listening${NC}"
fi

# Access info
server_ip=$(hostname -I 2>/dev/null | awk '{print $1}')
echo ""
echo "Access Information:"
echo "  HAProxy Stats: http://${server_ip}:8404/stats"
echo "    Username: admin"
echo "    Password: admin (default)"
echo ""
echo "  MongoDB: localhost:27017"

echo ""
echo "========================================================================"
echo -e "${YELLOW}IMPORTANT: You must LOGOUT and LOGIN again to see menu changes!${NC}"
echo "========================================================================"
echo ""
