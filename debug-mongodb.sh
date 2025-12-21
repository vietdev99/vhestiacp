#!/bin/bash
#==========================================================================
# VHestiaCP - MongoDB Debug & Fix Script
#==========================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HESTIA="/usr/local/hestia"

echo ""
echo "=============================================="
echo "   VHestiaCP MongoDB Diagnostics"
echo "=============================================="
echo ""

#----------------------------------------------------------#
# Check 1: MongoDB installation
#----------------------------------------------------------#
echo -e "${BLUE}[1/7] Checking MongoDB installation...${NC}"

if command -v mongod &>/dev/null; then
    version=$(mongod --version 2>&1 | head -1)
    echo -e "  ${GREEN}✓${NC} MongoDB installed: $version"
else
    echo -e "  ${RED}✗${NC} MongoDB not installed"
    echo "  Run: sudo apt install mongodb-org"
    exit 1
fi

#----------------------------------------------------------#
# Check 2: MongoDB shell
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[2/7] Checking MongoDB shell...${NC}"

if command -v mongosh &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} mongosh available"
    MONGO_SHELL="mongosh"
elif command -v mongo &>/dev/null; then
    echo -e "  ${GREEN}✓${NC} mongo available (legacy)"
    MONGO_SHELL="mongo"
else
    echo -e "  ${RED}✗${NC} No MongoDB shell found"
    echo "  Run: sudo apt install mongodb-mongosh"
    exit 1
fi

#----------------------------------------------------------#
# Check 3: MongoDB service status
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[3/7] Checking MongoDB service...${NC}"

if systemctl is-active --quiet mongod; then
    echo -e "  ${GREEN}✓${NC} MongoDB service is running"
else
    echo -e "  ${RED}✗${NC} MongoDB service is not running"
    echo "  Starting MongoDB..."
    systemctl start mongod
    sleep 2
    if systemctl is-active --quiet mongod; then
        echo -e "  ${GREEN}✓${NC} MongoDB started successfully"
    else
        echo -e "  ${RED}✗${NC} Failed to start MongoDB"
        echo "  Check: journalctl -u mongod -n 50"
        exit 1
    fi
fi

#----------------------------------------------------------#
# Check 4: MongoDB configuration
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[4/7] Checking MongoDB configuration...${NC}"

if [ -f /etc/mongod.conf ]; then
    echo -e "  ${GREEN}✓${NC} Config file exists: /etc/mongod.conf"
    
    # Check authorization
    if grep -q "authorization: enabled" /etc/mongod.conf; then
        echo -e "  ${YELLOW}!${NC} Authorization is ENABLED"
        AUTH_ENABLED="yes"
    else
        echo -e "  ${GREEN}✓${NC} Authorization is disabled (no auth needed)"
        AUTH_ENABLED="no"
    fi
    
    # Check bind IP
    bind_ip=$(grep "bindIp:" /etc/mongod.conf | awk '{print $2}')
    echo -e "  ${GREEN}✓${NC} Bind IP: ${bind_ip:-127.0.0.1}"
else
    echo -e "  ${RED}✗${NC} Config file missing"
fi

#----------------------------------------------------------#
# Check 5: VHestiaCP MongoDB config
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[5/7] Checking VHestiaCP MongoDB config...${NC}"

if [ -f "$HESTIA/conf/mongodb.conf" ]; then
    echo -e "  ${GREEN}✓${NC} VHestiaCP MongoDB config exists"
    source "$HESTIA/conf/mongodb.conf"
    if [ -n "$ROOT_PASSWORD" ]; then
        echo -e "  ${GREEN}✓${NC} Root password is set"
    else
        echo -e "  ${YELLOW}!${NC} Root password is empty"
    fi
else
    echo -e "  ${YELLOW}!${NC} VHestiaCP MongoDB config not found"
    echo "  Creating config file..."
    mkdir -p "$HESTIA/conf"
    cat > "$HESTIA/conf/mongodb.conf" << 'EOF'
# VHestiaCP MongoDB Configuration
ROOT_PASSWORD=''
EOF
    echo -e "  ${GREEN}✓${NC} Config file created"
fi

#----------------------------------------------------------#
# Check 6: Test MongoDB connection
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[6/7] Testing MongoDB connection...${NC}"

# Try without auth first
result=$($MONGO_SHELL --quiet --eval "db.runCommand({ping:1}).ok" 2>&1)
if [ "$result" = "1" ]; then
    echo -e "  ${GREEN}✓${NC} Connection successful (no auth)"
    CONNECTION_OK="yes"
else
    # Try with auth if password is set
    if [ -n "$ROOT_PASSWORD" ] && [ "$AUTH_ENABLED" = "yes" ]; then
        result=$($MONGO_SHELL --quiet --eval "db.runCommand({ping:1}).ok" -u admin -p "$ROOT_PASSWORD" --authenticationDatabase admin 2>&1)
        if [ "$result" = "1" ]; then
            echo -e "  ${GREEN}✓${NC} Connection successful (with auth)"
            CONNECTION_OK="yes"
        else
            echo -e "  ${RED}✗${NC} Connection failed with auth"
            echo "  Error: $result"
            CONNECTION_OK="no"
        fi
    else
        echo -e "  ${RED}✗${NC} Connection failed"
        echo "  Error: $result"
        CONNECTION_OK="no"
    fi
fi

#----------------------------------------------------------#
# Check 7: Test database creation
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[7/7] Testing database creation...${NC}"

if [ "$CONNECTION_OK" = "yes" ]; then
    test_db="vhestiacp_test_$(date +%s)"
    
    if [ "$AUTH_ENABLED" = "yes" ] && [ -n "$ROOT_PASSWORD" ]; then
        result=$($MONGO_SHELL --quiet --eval "db.getSiblingDB('$test_db').createCollection('test')" -u admin -p "$ROOT_PASSWORD" --authenticationDatabase admin 2>&1)
    else
        result=$($MONGO_SHELL --quiet --eval "db.getSiblingDB('$test_db').createCollection('test')" 2>&1)
    fi
    
    if echo "$result" | grep -q "ok"; then
        echo -e "  ${GREEN}✓${NC} Database creation works!"
        
        # Cleanup test database
        if [ "$AUTH_ENABLED" = "yes" ] && [ -n "$ROOT_PASSWORD" ]; then
            $MONGO_SHELL --quiet --eval "db.getSiblingDB('$test_db').dropDatabase()" -u admin -p "$ROOT_PASSWORD" --authenticationDatabase admin 2>/dev/null
        else
            $MONGO_SHELL --quiet --eval "db.getSiblingDB('$test_db').dropDatabase()" 2>/dev/null
        fi
        echo -e "  ${GREEN}✓${NC} Test database cleaned up"
    else
        echo -e "  ${RED}✗${NC} Database creation failed"
        echo "  Error: $result"
    fi
else
    echo -e "  ${YELLOW}!${NC} Skipped (connection failed)"
fi

#----------------------------------------------------------#
# Summary
#----------------------------------------------------------#
echo ""
echo "=============================================="
echo "   Summary"
echo "=============================================="
echo ""

if [ "$CONNECTION_OK" = "yes" ]; then
    echo -e "${GREEN}MongoDB is working correctly!${NC}"
    echo ""
    echo "If you're still having issues creating databases from the UI:"
    echo "1. Make sure the v-add-database-mongo script is up to date"
    echo "2. Check /usr/local/hestia/log/mongodb.log for errors"
    echo "3. Try creating a database manually:"
    if [ "$AUTH_ENABLED" = "yes" ]; then
        echo "   $MONGO_SHELL -u admin -p 'password' --authenticationDatabase admin"
    else
        echo "   $MONGO_SHELL"
    fi
    echo "   > use mydb"
    echo "   > db.createCollection('test')"
else
    echo -e "${RED}MongoDB has issues that need to be fixed.${NC}"
    echo ""
    echo "Suggested fixes:"
    echo "1. Check MongoDB logs: journalctl -u mongod -n 100"
    echo "2. Check config: cat /etc/mongod.conf"
    echo "3. Restart MongoDB: systemctl restart mongod"
    
    if [ "$AUTH_ENABLED" = "yes" ]; then
        echo ""
        echo "If authentication is the issue, you can disable it temporarily:"
        echo "1. Edit /etc/mongod.conf"
        echo "2. Comment out or remove: authorization: enabled"
        echo "3. Restart: systemctl restart mongod"
    fi
fi

echo ""
