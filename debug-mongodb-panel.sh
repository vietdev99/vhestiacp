#!/bin/bash
#==========================================================================
# Debug MongoDB Panel Issues
#==========================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HESTIA="/usr/local/hestia"

echo ""
echo "=============================================="
echo "   MongoDB Panel Debug"
echo "=============================================="
echo ""

echo -e "${BLUE}1. Check MongoDB System Status:${NC}"
if grep -q "MONGODB_SYSTEM='yes'" $HESTIA/conf/hestia.conf 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} MONGODB_SYSTEM='yes' is set"
else
    echo -e "   ${RED}✗${NC} MONGODB_SYSTEM is NOT set"
    echo "   Fix: echo \"MONGODB_SYSTEM='yes'\" | sudo tee -a $HESTIA/conf/hestia.conf"
fi

echo ""
echo -e "${BLUE}2. Check Mongo Express Status:${NC}"
if grep -q "MONGO_EXPRESS_SYSTEM='yes'" $HESTIA/conf/hestia.conf 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} MONGO_EXPRESS_SYSTEM='yes' is set"
elif grep -q "MONGO_EXPRESS='yes'" $HESTIA/conf/hestia.conf 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} MONGO_EXPRESS='yes' is set"
else
    echo -e "   ${YELLOW}⚠${NC} Mongo Express is NOT configured in hestia.conf"
    echo "   To enable: echo \"MONGO_EXPRESS_SYSTEM='yes'\" | sudo tee -a $HESTIA/conf/hestia.conf"
    echo "              echo \"MONGO_EXPRESS_PORT='8081'\" | sudo tee -a $HESTIA/conf/hestia.conf"
fi

# Check if service exists
if systemctl is-active --quiet mongo-express 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} mongo-express service is running"
else
    echo -e "   ${YELLOW}⚠${NC} mongo-express service is not running"
fi

echo ""
echo -e "${BLUE}3. Check User Config File:${NC}"
user_conf="$HESTIA/data/users/admin/mongodb.conf"
if [ -f "$user_conf" ]; then
    echo -e "   ${GREEN}✓${NC} File exists: $user_conf"
    echo "   Content:"
    cat "$user_conf" | sed 's/^/      /'
else
    echo -e "   ${RED}✗${NC} File NOT found: $user_conf"
    echo "   Fix: Create it with your database info"
fi

echo ""
echo -e "${BLUE}4. Check v-list-database-mongo Script:${NC}"
if [ -x "$HESTIA/bin/v-list-database-mongo" ]; then
    echo -e "   ${GREEN}✓${NC} Script exists and is executable"
else
    echo -e "   ${RED}✗${NC} Script missing or not executable"
fi

echo ""
echo -e "${BLUE}5. Test v-list-database-mongo Output:${NC}"
echo "   Running: $HESTIA/bin/v-list-database-mongo admin json"
echo ""
output=$($HESTIA/bin/v-list-database-mongo admin json 2>&1)
echo "   Output: $output"

# Validate JSON
echo ""
echo -e "${BLUE}6. Validate JSON Output:${NC}"
if echo "$output" | python3 -m json.tool > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} JSON is valid"
    echo "   Formatted:"
    echo "$output" | python3 -m json.tool 2>/dev/null | sed 's/^/      /'
elif echo "$output" | jq . > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} JSON is valid"
    echo "   Formatted:"
    echo "$output" | jq . 2>/dev/null | sed 's/^/      /'
else
    echo -e "   ${RED}✗${NC} JSON is INVALID"
    echo "   Raw output: $output"
fi

echo ""
echo -e "${BLUE}7. Check MongoDB Password File:${NC}"
if [ -f "$HESTIA/conf/mongodb.conf" ]; then
    echo -e "   ${GREEN}✓${NC} Password file exists"
    echo "   ROOT_PASSWORD is set: $(grep -q ROOT_PASSWORD $HESTIA/conf/mongodb.conf && echo 'yes' || echo 'no')"
else
    echo -e "   ${RED}✗${NC} Password file missing: $HESTIA/conf/mongodb.conf"
fi

echo ""
echo -e "${BLUE}8. Test MongoDB Connection:${NC}"
if [ -f "$HESTIA/conf/mongodb.conf" ]; then
    source "$HESTIA/conf/mongodb.conf"
    if command -v mongosh &>/dev/null; then
        result=$(mongosh --quiet -u admin -p "$ROOT_PASSWORD" --authenticationDatabase admin --eval "db.runCommand({ping:1}).ok" 2>&1)
        if [ "$result" = "1" ]; then
            echo -e "   ${GREEN}✓${NC} MongoDB connection successful"
        else
            echo -e "   ${RED}✗${NC} MongoDB connection failed: $result"
        fi
    else
        echo -e "   ${YELLOW}⚠${NC} mongosh not found"
    fi
fi

echo ""
echo -e "${BLUE}9. Check PHP Execution:${NC}"
php_test=$(php -r "
\$output = [];
exec('$HESTIA/bin/v-list-database-mongo admin json 2>&1', \$output, \$return);
\$json = implode('', \$output);
\$data = json_decode(\$json, true);
if (json_last_error() === JSON_ERROR_NONE) {
    echo 'JSON parsed OK - ' . count(\$data) . ' database(s)';
} else {
    echo 'JSON error: ' . json_last_error_msg();
}
" 2>&1)
echo "   PHP test: $php_test"

echo ""
echo "=============================================="
echo "   Summary"
echo "=============================================="

issues=0

if ! grep -q "MONGODB_SYSTEM='yes'" $HESTIA/conf/hestia.conf 2>/dev/null; then
    echo -e "   ${RED}✗${NC} Add MONGODB_SYSTEM='yes' to hestia.conf"
    issues=$((issues+1))
fi

if [ ! -f "$user_conf" ]; then
    echo -e "   ${RED}✗${NC} Create user mongodb.conf file"
    issues=$((issues+1))
fi

if [ $issues -eq 0 ]; then
    echo -e "   ${GREEN}All checks passed!${NC}"
fi

echo ""
