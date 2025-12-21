#!/bin/bash
#==========================================================================
# VHestiaCP Hotfix - Complete UI Fix
# Fixes: Menu tabs, Services list, HAProxy detection, Server config
#==========================================================================

set -e

HESTIA="/usr/local/hestia"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "   VHestiaCP Complete UI Hotfix"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Check vhestiacp-full directory
if [ ! -d "$SCRIPT_DIR/web" ] || [ ! -d "$SCRIPT_DIR/bin" ]; then
    echo -e "${RED}Error: Run this from vhestiacp-full directory${NC}"
    exit 1
fi

#----------------------------------------------------------#
#                     Fix 1: Bin Scripts                   #
#----------------------------------------------------------#
echo -e "${BLUE}[1/5] Updating bin scripts...${NC}"

# Copy v-list-sys-services (adds HAProxy, MongoDB to services list)
if [ -f "$SCRIPT_DIR/bin/v-list-sys-services" ]; then
    cp -f "$SCRIPT_DIR/bin/v-list-sys-services" "$HESTIA/bin/"
    chmod +x "$HESTIA/bin/v-list-sys-services"
    echo -e "  ${GREEN}✓${NC} v-list-sys-services"
fi

# Copy v-list-sys-haproxy (fixes HAProxy detection)
if [ -f "$SCRIPT_DIR/bin/v-list-sys-haproxy" ]; then
    cp -f "$SCRIPT_DIR/bin/v-list-sys-haproxy" "$HESTIA/bin/"
    chmod +x "$HESTIA/bin/v-list-sys-haproxy"
    echo -e "  ${GREEN}✓${NC} v-list-sys-haproxy"
fi

# Copy MongoDB scripts
for script in v-add-database-mongo v-delete-database-mongo v-list-database-mongo v-add-sys-mongodb; do
    if [ -f "$SCRIPT_DIR/bin/$script" ]; then
        cp -f "$SCRIPT_DIR/bin/$script" "$HESTIA/bin/"
        chmod +x "$HESTIA/bin/$script"
        echo -e "  ${GREEN}✓${NC} $script"
    fi
done

# Copy MongoDB functions
if [ -f "$SCRIPT_DIR/func/mongodb.sh" ]; then
    cp -f "$SCRIPT_DIR/func/mongodb.sh" "$HESTIA/func/"
    echo -e "  ${GREEN}✓${NC} func/mongodb.sh"
fi

# Copy v-list-sys-config
if [ -f "$SCRIPT_DIR/bin/v-list-sys-config" ]; then
    cp -f "$SCRIPT_DIR/bin/v-list-sys-config" "$HESTIA/bin/"
    chmod +x "$HESTIA/bin/v-list-sys-config"
    echo -e "  ${GREEN}✓${NC} v-list-sys-config"
fi

#----------------------------------------------------------#
#                     Fix 2: Panel Navigation              #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[2/5] Updating panel navigation...${NC}"

# Copy panel.php (adds HAProxy, MongoDB, Node.js, Python tabs)
if [ -f "$SCRIPT_DIR/web/templates/includes/panel.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/includes/panel.php" "$HESTIA/web/templates/includes/"
    echo -e "  ${GREEN}✓${NC} panel.php (navigation tabs)"
fi

#----------------------------------------------------------#
#                     Fix 3: Template Pages                #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[3/5] Copying template pages...${NC}"

# List templates
for page in list_haproxy list_mongodb list_nodejs list_python; do
    if [ -f "$SCRIPT_DIR/web/templates/pages/${page}.php" ]; then
        cp -f "$SCRIPT_DIR/web/templates/pages/${page}.php" "$HESTIA/web/templates/pages/"
        echo -e "  ${GREEN}✓${NC} ${page}.php"
    fi
done

# Add/Edit templates
for page in add_mongodb edit_mongodb edit_haproxy; do
    if [ -f "$SCRIPT_DIR/web/templates/pages/${page}.php" ]; then
        cp -f "$SCRIPT_DIR/web/templates/pages/${page}.php" "$HESTIA/web/templates/pages/"
        echo -e "  ${GREEN}✓${NC} ${page}.php"
    fi
done

# PM2 log viewer template
if [ -f "$SCRIPT_DIR/web/templates/pages/view_pm2_log.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/pages/view_pm2_log.php" "$HESTIA/web/templates/pages/"
    echo -e "  ${GREEN}✓${NC} view_pm2_log.php"
fi

# Server config templates
for page in edit_server_haproxy edit_server_mongodb; do
    if [ -f "$SCRIPT_DIR/web/templates/pages/${page}.php" ]; then
        cp -f "$SCRIPT_DIR/web/templates/pages/${page}.php" "$HESTIA/web/templates/pages/"
        echo -e "  ${GREEN}✓${NC} ${page}.php"
    fi
done

# Main server config page (with VHestiaCP section)
if [ -f "$SCRIPT_DIR/web/templates/pages/edit_server.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/pages/edit_server.php" "$HESTIA/web/templates/pages/"
    echo -e "  ${GREEN}✓${NC} edit_server.php"
fi

# Services page (HAProxy button)
if [ -f "$SCRIPT_DIR/web/templates/pages/list_services.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/pages/list_services.php" "$HESTIA/web/templates/pages/"
    echo -e "  ${GREEN}✓${NC} list_services.php"
fi

#----------------------------------------------------------#
#                     Fix 4: Controllers                   #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[4/5] Copying controllers...${NC}"

# Create directories
mkdir -p "$HESTIA/web/list"/{haproxy,mongodb,nodejs,python}
mkdir -p "$HESTIA/web/add"/mongodb
mkdir -p "$HESTIA/web/edit"/{haproxy,mongodb}
mkdir -p "$HESTIA/web/edit/server"/{haproxy,mongodb}
mkdir -p "$HESTIA/web/delete"/{mongodb,pm2}
mkdir -p "$HESTIA/web"/{start,stop,restart}/pm2
mkdir -p "$HESTIA/web/view/pm2-log"

# List controllers
for dir in haproxy mongodb nodejs python; do
    if [ -f "$SCRIPT_DIR/web/list/${dir}/index.php" ]; then
        cp -f "$SCRIPT_DIR/web/list/${dir}/index.php" "$HESTIA/web/list/${dir}/"
        echo -e "  ${GREEN}✓${NC} list/${dir}/index.php"
    fi
done

# MongoDB add controller
if [ -f "$SCRIPT_DIR/web/add/mongodb/index.php" ]; then
    cp -f "$SCRIPT_DIR/web/add/mongodb/index.php" "$HESTIA/web/add/mongodb/"
    echo -e "  ${GREEN}✓${NC} add/mongodb/index.php"
fi

# MongoDB edit controller
if [ -f "$SCRIPT_DIR/web/edit/mongodb/index.php" ]; then
    cp -f "$SCRIPT_DIR/web/edit/mongodb/index.php" "$HESTIA/web/edit/mongodb/"
    echo -e "  ${GREEN}✓${NC} edit/mongodb/index.php"
fi

# Edit HAProxy
if [ -f "$SCRIPT_DIR/web/edit/haproxy/index.php" ]; then
    cp -f "$SCRIPT_DIR/web/edit/haproxy/index.php" "$HESTIA/web/edit/haproxy/"
    echo -e "  ${GREEN}✓${NC} edit/haproxy/index.php"
fi

# Server config controllers
for srv in haproxy mongodb; do
    if [ -f "$SCRIPT_DIR/web/edit/server/${srv}/index.php" ]; then
        cp -f "$SCRIPT_DIR/web/edit/server/${srv}/index.php" "$HESTIA/web/edit/server/${srv}/"
        echo -e "  ${GREEN}✓${NC} edit/server/${srv}/index.php"
    fi
done

# PM2 action controllers
for action in start stop restart delete; do
    if [ -f "$SCRIPT_DIR/web/${action}/pm2/index.php" ]; then
        mkdir -p "$HESTIA/web/${action}/pm2"
        cp -f "$SCRIPT_DIR/web/${action}/pm2/index.php" "$HESTIA/web/${action}/pm2/"
    fi
done
echo -e "  ${GREEN}✓${NC} PM2 action controllers (start/stop/restart/delete)"

# PM2 log viewer
if [ -f "$SCRIPT_DIR/web/view/pm2-log/index.php" ]; then
    mkdir -p "$HESTIA/web/view/pm2-log"
    cp -f "$SCRIPT_DIR/web/view/pm2-log/index.php" "$HESTIA/web/view/pm2-log/"
    echo -e "  ${GREEN}✓${NC} view/pm2-log/index.php"
fi

# PM2 log viewer template
if [ -f "$SCRIPT_DIR/web/templates/pages/view_pm2_log.php" ]; then
    cp -f "$SCRIPT_DIR/web/templates/pages/view_pm2_log.php" "$HESTIA/web/templates/pages/"
    echo -e "  ${GREEN}✓${NC} view_pm2_log.php template"
fi

# MongoDB delete controller
if [ -f "$SCRIPT_DIR/web/delete/mongodb/index.php" ]; then
    mkdir -p "$HESTIA/web/delete/mongodb"
    cp -f "$SCRIPT_DIR/web/delete/mongodb/index.php" "$HESTIA/web/delete/mongodb/"
    echo -e "  ${GREEN}✓${NC} delete/mongodb/index.php"
fi

#----------------------------------------------------------#
#                     Fix 5: Verify & Report               #
#----------------------------------------------------------#
echo ""
echo -e "${BLUE}[5/5] Verifying installation...${NC}"

echo ""
echo "Checking services in v-list-sys-services:"
if grep -q "HAPROXY_SYSTEM" "$HESTIA/bin/v-list-sys-services"; then
    echo -e "  ${GREEN}✓${NC} HAProxy service check added"
else
    echo -e "  ${RED}✗${NC} HAProxy service check missing"
fi

if grep -q "MONGODB_SYSTEM" "$HESTIA/bin/v-list-sys-services"; then
    echo -e "  ${GREEN}✓${NC} MongoDB service check added"
else
    echo -e "  ${RED}✗${NC} MongoDB service check missing"
fi

echo ""
echo "Checking v-list-sys-config:"
if grep -q "MONGODB_SYSTEM" "$HESTIA/bin/v-list-sys-config"; then
    echo -e "  ${GREEN}✓${NC} VHestiaCP variables present"
else
    echo -e "  ${RED}✗${NC} VHestiaCP variables missing"
fi

echo ""
echo "Checking panel.php:"
if grep -q "HAPROXY_SYSTEM" "$HESTIA/web/templates/includes/panel.php"; then
    echo -e "  ${GREEN}✓${NC} HAProxy tab present"
else
    echo -e "  ${RED}✗${NC} HAProxy tab missing"
fi

echo ""
echo "=============================================="
echo -e "${GREEN}   Hotfix Complete!${NC}"
echo "=============================================="
echo ""
echo "Please LOGOUT and LOGIN again to see changes."
echo ""
echo "After login, you should see:"
echo "  - HAProxy tab in main menu (admin only)"
echo "  - MongoDB, Node.js, Python tabs"
echo "  - HAProxy & MongoDB in Services list (/list/server/)"
echo "  - VHestiaCP Extensions section in Server Config (/edit/server/)"
echo ""
