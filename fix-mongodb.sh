#!/bin/bash
#==========================================================================
# VHestiaCP - Fix MongoDB Service
#==========================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "   MongoDB Service Fix & Debug"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

#----------------------------------------------------------#
#                     Check Status                         #
#----------------------------------------------------------#
echo -e "${BLUE}[1/6] Checking MongoDB status...${NC}"

# Check if MongoDB is installed
if command -v mongod &>/dev/null; then
    mongod_version=$(mongod --version 2>&1 | head -1)
    # Extract version number (e.g., "8.0.17" from "db version v8.0.17")
    version_number=$(echo "$mongod_version" | grep -oP 'v\K[0-9]+\.[0-9]+' | head -1)
    major_version=$(echo "$version_number" | cut -d. -f1)
    echo -e "  ${GREEN}✓${NC} MongoDB installed: $mongod_version"
    echo -e "  ${GREEN}✓${NC} Major version: $major_version"
else
    echo -e "  ${RED}✗${NC} MongoDB not installed"
    echo "  Installing MongoDB..."
    
    # Detect Ubuntu version
    ubuntu_codename=$(lsb_release -cs)
    echo "  Ubuntu: $ubuntu_codename"
    
    # For Ubuntu 24.04, use MongoDB 8.0
    if [ "$ubuntu_codename" = "noble" ]; then
        MONGO_VERSION="8.0"
    else
        MONGO_VERSION="7.0"
    fi
    major_version=$(echo "$MONGO_VERSION" | cut -d. -f1)
    
    # Add MongoDB repo
    curl -fsSL "https://www.mongodb.org/static/pgp/server-${MONGO_VERSION}.asc" | \
        gpg --dearmor -o "/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg" 2>/dev/null
    
    echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-${MONGO_VERSION}.gpg ] https://repo.mongodb.org/apt/ubuntu ${ubuntu_codename}/mongodb-org/${MONGO_VERSION} multiverse" > /etc/apt/sources.list.d/mongodb-org-${MONGO_VERSION}.list
    
    apt-get update
    apt-get install -y mongodb-org
fi

#----------------------------------------------------------#
#                     Check Service                        #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[2/6] Checking service status...${NC}"

systemctl status mongod --no-pager 2>&1 | head -15 || true

#----------------------------------------------------------#
#                     Fix Permissions                      #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[3/6] Fixing permissions...${NC}"

# Create directories if not exist
mkdir -p /var/lib/mongodb
mkdir -p /var/log/mongodb
mkdir -p /tmp

# Fix ownership
chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb

# Fix permissions  
chmod 755 /var/lib/mongodb
chmod 755 /var/log/mongodb

echo -e "  ${GREEN}✓${NC} Permissions fixed"

# Check if lock file exists and remove it
if [ -f /var/lib/mongodb/mongod.lock ]; then
    rm -f /var/lib/mongodb/mongod.lock
    echo -e "  ${GREEN}✓${NC} Removed stale lock file"
fi

#----------------------------------------------------------#
#                     Fix AppArmor                         #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[4/6] Checking AppArmor...${NC}"

# Check if AppArmor is blocking MongoDB
if command -v aa-status &>/dev/null; then
    if aa-status 2>/dev/null | grep -q "mongod"; then
        echo "  AppArmor profile found for mongod"
        # Set to complain mode instead of enforce
        if [ -f /etc/apparmor.d/usr.bin.mongod ]; then
            aa-complain /etc/apparmor.d/usr.bin.mongod 2>/dev/null || true
            echo -e "  ${GREEN}✓${NC} Set AppArmor to complain mode"
        fi
    else
        echo -e "  ${GREEN}✓${NC} No AppArmor restrictions on mongod"
    fi
else
    echo -e "  ${GREEN}✓${NC} AppArmor not installed"
fi

#----------------------------------------------------------#
#                     Fix Configuration                    #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[5/6] Checking configuration...${NC}"

config_needs_update="no"

# Check if config file exists
if [ ! -f /etc/mongod.conf ]; then
    config_needs_update="yes"
    echo "  Config file not found, will create..."
else
    # Check for deprecated options based on version
    if [ "$major_version" -ge 8 ]; then
        if grep -q "journal:" /etc/mongod.conf; then
            config_needs_update="yes"
            echo -e "  ${YELLOW}!${NC} Found deprecated 'journal.enabled' option (removed in MongoDB 8.0+)"
        fi
    fi
fi

if [ "$config_needs_update" = "yes" ]; then
    echo "  Creating configuration for MongoDB ${major_version}.x..."
    
    if [ "$major_version" -ge 8 ]; then
        # MongoDB 8.0+ config (no journal.enabled)
        cat > /etc/mongod.conf << 'EOF'
# VHestiaCP MongoDB Configuration
# Template for MongoDB 8.x and later
# Note: journal.enabled is deprecated in MongoDB 8.0+

storage:
  dbPath: /var/lib/mongodb

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
EOF
    else
        # MongoDB 7.x and earlier config (with journal.enabled)
        cat > /etc/mongod.conf << 'EOF'
# VHestiaCP MongoDB Configuration
# Template for MongoDB 6.x and 7.x

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
EOF
    fi
    echo -e "  ${GREEN}✓${NC} Configuration created for MongoDB ${major_version}.x"
else
    echo -e "  ${GREEN}✓${NC} Configuration OK"
fi

#----------------------------------------------------------#
#                     Restart Service                      #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[6/6] Restarting MongoDB service...${NC}"

# Reload systemd
systemctl daemon-reload

# Stop any running mongod
systemctl stop mongod 2>/dev/null || true
pkill -9 mongod 2>/dev/null || true

sleep 2

# Start MongoDB
systemctl start mongod

# Wait for it to start
echo "  Waiting for MongoDB to start..."
sleep 5

# Check status
if systemctl is-active --quiet mongod; then
    echo -e "  ${GREEN}✓ MongoDB is running!${NC}"
    
    # Show connection info
    echo ""
    echo "  MongoDB is now accessible at:"
    echo "    Host: 127.0.0.1"
    echo "    Port: 27017"
else
    echo -e "  ${RED}✗ MongoDB failed to start${NC}"
    echo ""
    echo "  Checking logs..."
    journalctl -u mongod --no-pager -n 30
    echo ""
    echo "  MongoDB log:"
    tail -50 /var/log/mongodb/mongod.log 2>/dev/null || echo "  (no log file)"
fi

echo ""
echo "=============================================="
echo "   Done!"
echo "=============================================="
echo ""
