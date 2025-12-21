#!/bin/bash
#===========================================================================#
#          VHestiaCP - Debug Script                                         #
#===========================================================================#

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

HESTIA="/usr/local/hestia"

echo ""
echo "========================================================================"
echo "                    VHestiaCP Debug Report                              "
echo "========================================================================"
echo ""

#----------------------------------------------------------#
#                     1. Check hestia.conf                 #
#----------------------------------------------------------#

echo -e "${BLUE}[1] Checking hestia.conf...${NC}"
if [ -f "$HESTIA/conf/hestia.conf" ]; then
    echo -e "${GREEN}✓ File exists${NC}"
    echo ""
    echo "VHestiaCP settings:"
    grep -E "HAPROXY|MONGODB|NODEJS|PYTHON|VHESTIACP" "$HESTIA/conf/hestia.conf" 2>/dev/null || echo "  (none found)"
else
    echo -e "${RED}✗ File not found${NC}"
fi

#----------------------------------------------------------#
#                     2. Check HAProxy                     #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[2] Checking HAProxy...${NC}"

# Check if installed
if command -v haproxy &>/dev/null; then
    echo -e "${GREEN}✓ HAProxy installed:${NC} $(haproxy -v 2>&1 | head -1)"
else
    echo -e "${RED}✗ HAProxy not installed${NC}"
fi

# Check service status
echo ""
echo "Service status:"
systemctl status haproxy --no-pager 2>&1 | head -10

# Check if listening on 8404
echo ""
echo "Checking port 8404:"
if ss -tlnp | grep -q ":8404"; then
    echo -e "${GREEN}✓ Port 8404 is listening${NC}"
    ss -tlnp | grep ":8404"
else
    echo -e "${RED}✗ Port 8404 is NOT listening${NC}"
fi

# Check HAProxy config
echo ""
echo "HAProxy config file:"
if [ -f /etc/haproxy/haproxy.cfg ]; then
    echo -e "${GREEN}✓ Config exists${NC}"
    echo ""
    echo "Stats section:"
    grep -A10 "listen stats" /etc/haproxy/haproxy.cfg 2>/dev/null || echo "  (stats section not found)"
else
    echo -e "${RED}✗ Config not found${NC}"
fi

# Validate config
echo ""
echo "Config validation:"
haproxy -c -f /etc/haproxy/haproxy.cfg 2>&1

# Check SSL cert
echo ""
echo "SSL Certificate:"
if [ -f /etc/haproxy/certs/default.pem ]; then
    echo -e "${GREEN}✓ default.pem exists${NC}"
else
    echo -e "${RED}✗ default.pem not found${NC}"
fi

#----------------------------------------------------------#
#                     3. Check MongoDB                     #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[3] Checking MongoDB...${NC}"

# Check if installed
if command -v mongod &>/dev/null; then
    echo -e "${GREEN}✓ MongoDB installed:${NC} $(mongod --version 2>&1 | head -1)"
else
    echo -e "${RED}✗ MongoDB not installed${NC}"
    
    # Check repos
    echo ""
    echo "MongoDB repos:"
    ls -la /etc/apt/sources.list.d/mongodb* 2>/dev/null || echo "  (no MongoDB repos found)"
fi

# Check service
echo ""
echo "Service status:"
systemctl status mongod --no-pager 2>&1 | head -10

#----------------------------------------------------------#
#                     4. Check Web Panel Files             #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[4] Checking Web Panel Files...${NC}"

# Check panel.php
echo ""
echo "panel.php:"
panel_file="$HESTIA/web/templates/includes/panel.php"
if [ -f "$panel_file" ]; then
    echo -e "${GREEN}✓ File exists${NC} ($panel_file)"
    echo ""
    echo "Checking for VHestiaCP tabs:"
    
    if grep -q "MONGODB_SYSTEM" "$panel_file"; then
        echo -e "  ${GREEN}✓ MongoDB tab found${NC}"
    else
        echo -e "  ${RED}✗ MongoDB tab NOT found${NC}"
    fi
    
    if grep -q "NODEJS_SYSTEM" "$panel_file"; then
        echo -e "  ${GREEN}✓ Node.js tab found${NC}"
    else
        echo -e "  ${RED}✗ Node.js tab NOT found${NC}"
    fi
    
    if grep -q "PYTHON_SYSTEM" "$panel_file"; then
        echo -e "  ${GREEN}✓ Python tab found${NC}"
    else
        echo -e "  ${RED}✗ Python tab NOT found${NC}"
    fi
    
    if grep -q "HAPROXY_SYSTEM" "$panel_file"; then
        echo -e "  ${GREEN}✓ HAProxy tab found${NC}"
    else
        echo -e "  ${RED}✗ HAProxy tab NOT found${NC}"
    fi
    
    # Show line count
    echo ""
    echo "File info:"
    wc -l "$panel_file"
    ls -la "$panel_file"
else
    echo -e "${RED}✗ File not found${NC}"
fi

# Check list_services.php
echo ""
echo "list_services.php:"
services_file="$HESTIA/web/templates/pages/list_services.php"
if [ -f "$services_file" ]; then
    echo -e "${GREEN}✓ File exists${NC}"
    if grep -q "HAPROXY" "$services_file"; then
        echo -e "  ${GREEN}✓ HAProxy button found${NC}"
    else
        echo -e "  ${RED}✗ HAProxy button NOT found${NC}"
    fi
else
    echo -e "${RED}✗ File not found${NC}"
fi

# Check template pages
echo ""
echo "VHestiaCP template pages:"
for page in list_mongodb list_nodejs list_python list_haproxy; do
    if [ -f "$HESTIA/web/templates/pages/${page}.php" ]; then
        echo -e "  ${GREEN}✓${NC} ${page}.php"
    else
        echo -e "  ${RED}✗${NC} ${page}.php (missing)"
    fi
done

# Check list controllers
echo ""
echo "VHestiaCP list controllers:"
for dir in mongodb nodejs python haproxy; do
    if [ -f "$HESTIA/web/list/${dir}/index.php" ]; then
        echo -e "  ${GREEN}✓${NC} list/${dir}/index.php"
    else
        echo -e "  ${RED}✗${NC} list/${dir}/index.php (missing)"
    fi
done

#----------------------------------------------------------#
#                     5. Check Session Variables           #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[5] Session Variables (from hestia.conf)...${NC}"
echo ""
echo "These values should appear in PHP \$_SESSION:"

haproxy_sys=$(grep "^HAPROXY_SYSTEM" "$HESTIA/conf/hestia.conf" 2>/dev/null | cut -d"'" -f2)
mongodb_sys=$(grep "^MONGODB_SYSTEM" "$HESTIA/conf/hestia.conf" 2>/dev/null | cut -d"'" -f2)
nodejs_sys=$(grep "^NODEJS_SYSTEM" "$HESTIA/conf/hestia.conf" 2>/dev/null | cut -d"'" -f2)
python_sys=$(grep "^PYTHON_SYSTEM" "$HESTIA/conf/hestia.conf" 2>/dev/null | cut -d"'" -f2)

echo "  HAPROXY_SYSTEM = '$haproxy_sys'"
echo "  MONGODB_SYSTEM = '$mongodb_sys'"
echo "  NODEJS_SYSTEM = '$nodejs_sys'"
echo "  PYTHON_SYSTEM = '$python_sys'"

if [ "$haproxy_sys" != "yes" ] && [ "$mongodb_sys" != "yes" ] && [ "$nodejs_sys" != "yes" ]; then
    echo ""
    echo -e "${YELLOW}⚠ Warning: No VHestiaCP components enabled in hestia.conf${NC}"
    echo "  Menu tabs won't show unless these are set to 'yes'"
fi

#----------------------------------------------------------#
#                     6. Firewall                          #
#----------------------------------------------------------#

echo ""
echo -e "${BLUE}[6] Firewall Rules...${NC}"
echo ""
echo "Port 8404 (HAProxy stats):"
iptables -L INPUT -n 2>/dev/null | grep -E "8404|haproxy" || echo "  (no specific rule found)"

echo ""
echo "Hestia firewall config:"
if [ -f "$HESTIA/data/firewall/rules.conf" ]; then
    grep -i "haproxy\|8404" "$HESTIA/data/firewall/rules.conf" 2>/dev/null || echo "  (no HAProxy rule in config)"
fi

#----------------------------------------------------------#
#                     Summary & Recommendations            #
#----------------------------------------------------------#

echo ""
echo "========================================================================"
echo "                         SUMMARY                                        "
echo "========================================================================"
echo ""

issues=0

# HAProxy issues
if ! systemctl is-active --quiet haproxy; then
    echo -e "${RED}[ISSUE]${NC} HAProxy service is not running"
    issues=$((issues+1))
fi

if ! ss -tlnp | grep -q ":8404"; then
    echo -e "${RED}[ISSUE]${NC} HAProxy stats port 8404 not listening"
    issues=$((issues+1))
fi

# MongoDB issues
if ! command -v mongod &>/dev/null; then
    echo -e "${RED}[ISSUE]${NC} MongoDB is not installed"
    issues=$((issues+1))
fi

# Panel issues
if ! grep -q "MONGODB_SYSTEM" "$HESTIA/web/templates/includes/panel.php" 2>/dev/null; then
    echo -e "${RED}[ISSUE]${NC} panel.php doesn't have VHestiaCP tabs"
    issues=$((issues+1))
fi

# Config issues
if [ "$haproxy_sys" != "yes" ]; then
    echo -e "${YELLOW}[WARNING]${NC} HAPROXY_SYSTEM not set to 'yes' in hestia.conf"
fi

if [ $issues -eq 0 ]; then
    echo -e "${GREEN}No critical issues found!${NC}"
else
    echo ""
    echo -e "${YELLOW}Found $issues issue(s). Run the commands below to fix:${NC}"
fi

echo ""
echo "========================================================================"
echo ""
