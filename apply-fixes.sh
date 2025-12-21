#!/bin/bash
#==========================================================================
# VHestiaCP - Apply All Confirmed Fixes
# This script applies all tested and confirmed fixes
# Run after fresh install or to fix issues
#==========================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HESTIA="/usr/local/hestia"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo ""
echo "=============================================="
echo "   VHestiaCP - Apply All Confirmed Fixes"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check if in correct directory
if [ ! -f "$SCRIPT_DIR/bin/v-list-database-mongo" ]; then
    echo -e "${RED}Error: Run this from vhestiacp-full directory${NC}"
    exit 1
fi

errors=0

#----------------------------------------------------------#
# Fix 1: Permissions (CRITICAL)
#----------------------------------------------------------#
echo -e "${BLUE}[1/7] Fixing permissions...${NC}"
chmod 755 "$HESTIA" 2>/dev/null
chmod 755 "$HESTIA/conf" 2>/dev/null
chmod 755 "$HESTIA/data" 2>/dev/null
chmod 755 "$HESTIA/data/users" 2>/dev/null
chmod 755 "$HESTIA/func" 2>/dev/null
chmod 755 "$HESTIA/bin" 2>/dev/null
chmod 755 "$HESTIA/log" 2>/dev/null
chmod 644 "$HESTIA/conf/"*.conf 2>/dev/null
chmod 644 "$HESTIA/func/"*.sh 2>/dev/null

# Fix .mongodb directory for each user
for user_dir in "$HESTIA/data/users/"*/; do
    if [ -d "$user_dir" ]; then
        user=$(basename "$user_dir")
        if [ -d "/home/$user" ]; then
            mkdir -p "/home/$user/.mongodb"
            chown "$user:$user" "/home/$user/.mongodb" 2>/dev/null
            chmod 755 "/home/$user/.mongodb"
        fi
    fi
done
echo -e "  ${GREEN}✓${NC} Permissions fixed"

#----------------------------------------------------------#
# Fix 2: MongoDB bin scripts
#----------------------------------------------------------#
echo -e "${BLUE}[2/7] Copying MongoDB scripts...${NC}"

for script in v-list-database-mongo v-add-database-mongo v-delete-database-mongo v-add-sys-mongodb v-add-sys-mongo-express v-delete-sys-mongo-express; do
    if [ -f "$SCRIPT_DIR/bin/$script" ]; then
        cp -f "$SCRIPT_DIR/bin/$script" "$HESTIA/bin/"
        chmod +x "$HESTIA/bin/$script"
        echo -e "  ${GREEN}✓${NC} $script"
    else
        echo -e "  ${YELLOW}⚠${NC} $script not found in source"
    fi
done

#----------------------------------------------------------#
# Fix 3: MongoDB func
#----------------------------------------------------------#
echo -e "${BLUE}[3/7] Copying func/mongodb.sh...${NC}"
if [ -f "$SCRIPT_DIR/func/mongodb.sh" ]; then
    cp -f "$SCRIPT_DIR/func/mongodb.sh" "$HESTIA/func/"
    chmod 644 "$HESTIA/func/mongodb.sh"
    echo -e "  ${GREEN}✓${NC} mongodb.sh"
else
    echo -e "  ${RED}✗${NC} mongodb.sh not found"
    errors=$((errors+1))
fi

#----------------------------------------------------------#
# Fix 4: MongoDB web files
#----------------------------------------------------------#
echo -e "${BLUE}[4/7] Copying MongoDB web files...${NC}"

# Create directories
mkdir -p "$HESTIA/web/list/mongodb"
mkdir -p "$HESTIA/web/add/mongodb"
mkdir -p "$HESTIA/web/edit/mongodb"
mkdir -p "$HESTIA/web/delete/mongodb"

# Copy files
for webpath in "list/mongodb/index.php" "add/mongodb/index.php" "edit/mongodb/index.php" "delete/mongodb/index.php"; do
    if [ -f "$SCRIPT_DIR/web/$webpath" ]; then
        dir=$(dirname "$HESTIA/web/$webpath")
        mkdir -p "$dir"
        cp -f "$SCRIPT_DIR/web/$webpath" "$HESTIA/web/$webpath"
        echo -e "  ${GREEN}✓${NC} web/$webpath"
    fi
done

# Copy templates
for tpl in list_mongodb.php add_mongodb.php edit_mongodb.php; do
    if [ -f "$SCRIPT_DIR/web/templates/pages/$tpl" ]; then
        cp -f "$SCRIPT_DIR/web/templates/pages/$tpl" "$HESTIA/web/templates/pages/"
        echo -e "  ${GREEN}✓${NC} templates/pages/$tpl"
    fi
done

#----------------------------------------------------------#
# Fix 5: HAProxy scripts
#----------------------------------------------------------#
echo -e "${BLUE}[5/7] Copying HAProxy scripts...${NC}"

for script in v-add-sys-haproxy v-delete-sys-haproxy v-rebuild-haproxy-config; do
    if [ -f "$SCRIPT_DIR/bin/$script" ]; then
        cp -f "$SCRIPT_DIR/bin/$script" "$HESTIA/bin/"
        chmod +x "$HESTIA/bin/$script"
        echo -e "  ${GREEN}✓${NC} $script"
    fi
done

if [ -f "$SCRIPT_DIR/func/haproxy.sh" ]; then
    cp -f "$SCRIPT_DIR/func/haproxy.sh" "$HESTIA/func/"
    chmod 644 "$HESTIA/func/haproxy.sh"
    echo -e "  ${GREEN}✓${NC} haproxy.sh"
fi

#----------------------------------------------------------#
# Fix 6: HAProxy web files
#----------------------------------------------------------#
echo -e "${BLUE}[6/7] Copying HAProxy web files...${NC}"

# Create directories
mkdir -p "$HESTIA/web/list/haproxy"
mkdir -p "$HESTIA/web/add/haproxy/frontend"
mkdir -p "$HESTIA/web/add/haproxy/backend"
mkdir -p "$HESTIA/web/delete/haproxy/frontend"
mkdir -p "$HESTIA/web/delete/haproxy/backend"
mkdir -p "$HESTIA/web/delete/haproxy/listen"

# Copy HAProxy web files
if [ -d "$SCRIPT_DIR/web/list/haproxy" ]; then
    cp -rf "$SCRIPT_DIR/web/list/haproxy/"* "$HESTIA/web/list/haproxy/" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} web/list/haproxy/"
fi

if [ -d "$SCRIPT_DIR/web/add/haproxy" ]; then
    cp -rf "$SCRIPT_DIR/web/add/haproxy/"* "$HESTIA/web/add/haproxy/" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} web/add/haproxy/"
fi

if [ -d "$SCRIPT_DIR/web/delete/haproxy" ]; then
    cp -rf "$SCRIPT_DIR/web/delete/haproxy/"* "$HESTIA/web/delete/haproxy/" 2>/dev/null
    echo -e "  ${GREEN}✓${NC} web/delete/haproxy/"
fi

if [ -f "$SCRIPT_DIR/web/templates/pages/list_haproxy.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/pages/list_haproxy.php" "$HESTIA/web/templates/pages/"
    echo -e "  ${GREEN}✓${NC} templates/pages/list_haproxy.php"
fi

#----------------------------------------------------------#
# Fix 7: Reset scripts
#----------------------------------------------------------#
echo -e "${BLUE}[7/7] Copying reset scripts...${NC}"
mkdir -p "$HESTIA/install/vhestiacp"

if [ -f "$SCRIPT_DIR/reset-mongodb-password.sh" ]; then
    cp -f "$SCRIPT_DIR/reset-mongodb-password.sh" "$HESTIA/install/vhestiacp/"
    chmod +x "$HESTIA/install/vhestiacp/reset-mongodb-password.sh"
    echo -e "  ${GREEN}✓${NC} reset-mongodb-password.sh"
fi

#----------------------------------------------------------#
# Verification
#----------------------------------------------------------#
echo ""
echo "=============================================="
echo "   Verification"
echo "=============================================="

# Check critical files
echo ""
echo -e "${BLUE}Checking critical files...${NC}"

critical_files=(
    "bin/v-list-database-mongo"
    "bin/v-add-sys-haproxy"
    "func/mongodb.sh"
    "func/haproxy.sh"
    "web/list/mongodb/index.php"
    "web/list/haproxy/index.php"
)

for f in "${critical_files[@]}"; do
    if [ -f "$HESTIA/$f" ]; then
        echo -e "  ${GREEN}✓${NC} $f"
    else
        echo -e "  ${RED}✗${NC} $f MISSING"
        errors=$((errors+1))
    fi
done

# Test MongoDB list if installed
if grep -q "MONGODB_SYSTEM='yes'" "$HESTIA/conf/hestia.conf" 2>/dev/null; then
    echo ""
    echo -e "${BLUE}Testing MongoDB list...${NC}"
    output=$("$HESTIA/bin/v-list-database-mongo" admin json 2>&1)
    if echo "$output" | python3 -m json.tool > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓${NC} JSON output valid"
    else
        echo -e "  ${YELLOW}⚠${NC} JSON output: $output"
    fi
fi

# Summary
echo ""
echo "=============================================="
if [ $errors -eq 0 ]; then
    echo -e "   ${GREEN}All Fixes Applied Successfully!${NC}"
else
    echo -e "   ${YELLOW}Fixes Applied with $errors warnings${NC}"
fi
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Refresh panel to see changes"
echo ""
echo "  2. If MongoDB auth issues:"
echo "     sudo bash $HESTIA/install/vhestiacp/reset-mongodb-password.sh"
echo ""
echo "  3. If HAProxy/nginx port conflict:"
echo "     sudo bash $SCRIPT_DIR/fix-haproxy-nginx.sh"
echo ""
