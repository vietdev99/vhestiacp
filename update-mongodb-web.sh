#!/bin/bash
#==========================================================================
# VHestiaCP - Update MongoDB Web Templates
# Run this to update web files without fresh install
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
echo "   VHestiaCP - Update MongoDB Web Templates"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check if script is in vhestiacp-full directory
if [ ! -d "$SCRIPT_DIR/web" ]; then
    echo -e "${RED}Error: Cannot find web directory. Run this from vhestiacp-full folder.${NC}"
    exit 1
fi

echo -e "${BLUE}Step 1: Updating bin scripts...${NC}"
cp "$SCRIPT_DIR/bin/v-list-database-mongo" "$HESTIA/bin/v-list-database-mongo"
chmod +x "$HESTIA/bin/v-list-database-mongo"
echo -e "  ${GREEN}✓${NC} v-list-database-mongo"

cp "$SCRIPT_DIR/bin/v-add-database-mongo" "$HESTIA/bin/v-add-database-mongo"
chmod +x "$HESTIA/bin/v-add-database-mongo"
echo -e "  ${GREEN}✓${NC} v-add-database-mongo"

cp "$SCRIPT_DIR/bin/v-add-sys-mongo-express" "$HESTIA/bin/v-add-sys-mongo-express"
chmod +x "$HESTIA/bin/v-add-sys-mongo-express"
echo -e "  ${GREEN}✓${NC} v-add-sys-mongo-express"

cp "$SCRIPT_DIR/bin/v-delete-sys-mongo-express" "$HESTIA/bin/v-delete-sys-mongo-express"
chmod +x "$HESTIA/bin/v-delete-sys-mongo-express"
echo -e "  ${GREEN}✓${NC} v-delete-sys-mongo-express"

echo -e "${BLUE}Step 2: Updating MongoDB list controller...${NC}"
mkdir -p "$HESTIA/web/list/mongodb"
cp "$SCRIPT_DIR/web/list/mongodb/index.php" "$HESTIA/web/list/mongodb/index.php"
echo -e "  ${GREEN}✓${NC} list/mongodb/index.php"

echo -e "${BLUE}Step 3: Updating MongoDB templates...${NC}"
cp "$SCRIPT_DIR/web/templates/pages/list_mongodb.php" "$HESTIA/web/templates/pages/list_mongodb.php"
echo -e "  ${GREEN}✓${NC} templates/pages/list_mongodb.php"

cp "$SCRIPT_DIR/web/templates/pages/add_mongodb.php" "$HESTIA/web/templates/pages/add_mongodb.php"
echo -e "  ${GREEN}✓${NC} templates/pages/add_mongodb.php"

cp "$SCRIPT_DIR/web/templates/pages/edit_mongodb.php" "$HESTIA/web/templates/pages/edit_mongodb.php"
echo -e "  ${GREEN}✓${NC} templates/pages/edit_mongodb.php"

echo -e "${BLUE}Step 4: Updating add/edit/delete handlers...${NC}"
mkdir -p "$HESTIA/web/add/mongodb"
mkdir -p "$HESTIA/web/edit/mongodb"
mkdir -p "$HESTIA/web/delete/mongodb"

cp "$SCRIPT_DIR/web/add/mongodb/index.php" "$HESTIA/web/add/mongodb/index.php" 2>/dev/null || true
cp "$SCRIPT_DIR/web/edit/mongodb/index.php" "$HESTIA/web/edit/mongodb/index.php" 2>/dev/null || true
cp "$SCRIPT_DIR/web/delete/mongodb/index.php" "$HESTIA/web/delete/mongodb/index.php" 2>/dev/null || true
echo -e "  ${GREEN}✓${NC} add/edit/delete handlers"

echo -e "${BLUE}Step 5: Updating func/mongodb.sh...${NC}"
cp "$SCRIPT_DIR/func/mongodb.sh" "$HESTIA/func/mongodb.sh"
echo -e "  ${GREEN}✓${NC} func/mongodb.sh"

echo -e "${BLUE}Step 6: Setting permissions...${NC}"
chmod 755 "$HESTIA/web/list/mongodb"
chmod 755 "$HESTIA/web/add/mongodb"
chmod 755 "$HESTIA/web/edit/mongodb"
chmod 755 "$HESTIA/web/delete/mongodb"
chmod 644 "$HESTIA/web/templates/pages/"*mongodb*.php 2>/dev/null
chmod 644 "$HESTIA/func/mongodb.sh"

# Fix common permission issues
chmod 755 "$HESTIA"
chmod 755 "$HESTIA/conf"
chmod 755 "$HESTIA/data"
chmod 755 "$HESTIA/data/users"
chmod 755 "$HESTIA/log"
chmod 644 "$HESTIA/conf/"*.conf 2>/dev/null
echo -e "  ${GREEN}✓${NC} Permissions set"

echo ""
echo "=============================================="
echo -e "   ${GREEN}Update Complete!${NC}"
echo "=============================================="
echo ""
echo "Now refresh the panel page to see changes."
echo ""
