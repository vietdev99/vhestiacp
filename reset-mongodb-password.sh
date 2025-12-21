#!/bin/bash
#==========================================================================
# VHestiaCP - MongoDB Password Reset Script
# Resets the admin password and updates VHestiaCP config
#==========================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HESTIA="/usr/local/hestia"

echo ""
echo "=============================================="
echo "   VHestiaCP MongoDB Password Reset"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check MongoDB
if ! command -v mongod &>/dev/null; then
    echo -e "${RED}MongoDB is not installed${NC}"
    exit 1
fi

# Detect mongo shell
if command -v mongosh &>/dev/null; then
    MONGO_SHELL="mongosh"
else
    MONGO_SHELL="mongo"
fi

echo "Using shell: $MONGO_SHELL"

echo -e "${BLUE}Step 1: Stopping MongoDB...${NC}"
systemctl stop mongod
sleep 2

echo -e "${BLUE}Step 2: Backing up and modifying config...${NC}"
cp /etc/mongod.conf /etc/mongod.conf.bak.$(date +%Y%m%d_%H%M%S)

# Create minimal config without auth
cat > /etc/mongod.conf << 'EOF'
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

echo -e "${BLUE}Step 3: Starting MongoDB without auth...${NC}"
systemctl start mongod
sleep 5

# Check if started
retry=0
while [ $retry -lt 10 ]; do
    if $MONGO_SHELL --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
        echo -e "  ${GREEN}✓${NC} MongoDB is ready"
        break
    fi
    echo "  Waiting for MongoDB..."
    sleep 2
    ((retry++))
done

if [ $retry -eq 10 ]; then
    echo -e "${RED}Failed to start MongoDB${NC}"
    systemctl status mongod --no-pager | head -20
    exit 1
fi

echo -e "${BLUE}Step 4: Generating new admin password...${NC}"
NEW_PASSWORD=$(< /dev/urandom tr -dc 'A-Za-z0-9' | head -c 24)
echo -e "  New password: ${GREEN}$NEW_PASSWORD${NC}"

# Escape password for JavaScript
ESCAPED_PASSWORD=$(echo "$NEW_PASSWORD" | sed "s/'/\\\\'/g")

echo -e "${BLUE}Step 5: Creating/resetting admin user...${NC}"

# Create JavaScript file for user creation
cat > /tmp/create_admin.js << JSEOF
var adminDb = db.getSiblingDB('admin');

// Drop existing admin user if exists
try {
    adminDb.dropUser('admin');
    print('DROPPED_EXISTING');
} catch(e) {
    print('NO_EXISTING_USER');
}

// Create admin user
try {
    adminDb.createUser({
        user: 'admin',
        pwd: '$ESCAPED_PASSWORD',
        roles: [
            { role: 'userAdminAnyDatabase', db: 'admin' },
            { role: 'dbAdminAnyDatabase', db: 'admin' },
            { role: 'readWriteAnyDatabase', db: 'admin' },
            { role: 'clusterAdmin', db: 'admin' },
            { role: 'root', db: 'admin' }
        ]
    });
    print('USER_CREATED_OK');
} catch(e) {
    print('CREATE_ERROR: ' + e.message);
}

// Verify user exists
var user = adminDb.getUser('admin');
if (user) {
    print('USER_VERIFIED_OK');
} else {
    print('USER_NOT_FOUND');
}
JSEOF

create_result=$($MONGO_SHELL --quiet /tmp/create_admin.js 2>&1)
rm -f /tmp/create_admin.js

echo "  Result: $create_result"

if echo "$create_result" | grep -q "USER_VERIFIED_OK"; then
    echo -e "  ${GREEN}✓${NC} Admin user created and verified"
else
    echo -e "  ${RED}✗${NC} User creation may have issues"
    
    # Try alternative method
    echo "  Trying alternative method..."
    $MONGO_SHELL --quiet --eval "
        db.getSiblingDB('admin').createUser({
            user: 'admin',
            pwd: '$ESCAPED_PASSWORD',
            roles: ['root', 'userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
        })
    " 2>/dev/null
    
    # Verify
    verify=$($MONGO_SHELL --quiet --eval "db.getSiblingDB('admin').getUser('admin') ? 'EXISTS' : 'NOT_FOUND'" 2>/dev/null)
    if [ "$verify" = "EXISTS" ]; then
        echo -e "  ${GREEN}✓${NC} Admin user created with alternative method"
    else
        echo -e "  ${RED}✗${NC} All methods failed"
        exit 1
    fi
fi

echo -e "${BLUE}Step 6: Updating VHestiaCP config...${NC}"
mkdir -p "$HESTIA/conf"
cat > "$HESTIA/conf/mongodb.conf" << EOF
# VHestiaCP MongoDB Configuration
# Generated: $(date)
ROOT_PASSWORD='$NEW_PASSWORD'
AUTH_METHOD='scram'
EOF
chmod 600 "$HESTIA/conf/mongodb.conf"
echo -e "  ${GREEN}✓${NC} Password saved to $HESTIA/conf/mongodb.conf"

# Update hestia.conf if exists
if [ -f "$HESTIA/conf/hestia.conf" ]; then
    if grep -q "MONGODB_ROOT_PASSWORD=" "$HESTIA/conf/hestia.conf"; then
        sed -i "s/MONGODB_ROOT_PASSWORD=.*/MONGODB_ROOT_PASSWORD='$NEW_PASSWORD'/" "$HESTIA/conf/hestia.conf"
    fi
fi

echo -e "${BLUE}Step 7: Re-enabling authentication...${NC}"

cat > /etc/mongod.conf << 'EOF'
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
security:
  authorization: enabled
EOF

echo -e "${BLUE}Step 8: Restarting MongoDB with auth...${NC}"
systemctl restart mongod
sleep 5

if systemctl is-active --quiet mongod; then
    echo -e "  ${GREEN}✓${NC} MongoDB is running"
else
    echo -e "  ${RED}✗${NC} MongoDB failed to start"
    systemctl status mongod --no-pager | head -20
    exit 1
fi

echo -e "${BLUE}Step 9: Testing authentication...${NC}"
auth_test=$($MONGO_SHELL --quiet -u admin -p "$NEW_PASSWORD" --authenticationDatabase admin --eval "db.runCommand({ping:1}).ok" 2>&1)

if echo "$auth_test" | grep -q "1"; then
    echo -e "  ${GREEN}✓${NC} Authentication successful!"
else
    echo -e "  ${YELLOW}⚠${NC} Auth test result: $auth_test"
fi

echo ""
echo "=============================================="
echo -e "   ${GREEN}MongoDB Password Reset Complete!${NC}"
echo "=============================================="
echo ""
echo "New admin credentials:"
echo "  Username: admin"
echo "  Password: $NEW_PASSWORD"
echo ""
echo "Connection string:"
echo "  mongodb://admin:${NEW_PASSWORD}@localhost:27017/admin?authSource=admin"
echo ""
echo "Password saved to: $HESTIA/conf/mongodb.conf"
echo ""
echo "Test with:"
echo "  mongosh -u admin -p '$NEW_PASSWORD' --authenticationDatabase admin"
echo ""
