#!/bin/bash
#==========================================================
# VHestiaCP Quick Start Installer
# Usage: sudo bash quick-start.sh
#==========================================================

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

clear
echo -e "${CYAN}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║                    VHestiaCP Installer                    ║"
echo "║        HestiaCP + HAProxy + MongoDB + Node.js + Python    ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"
echo ""

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
INSTALL_DIR="$SCRIPT_DIR/install"

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Error: Please run as root (sudo bash quick-start.sh)${NC}"
    exit 1
fi

# Check Ubuntu version
if [ ! -f /etc/lsb-release ]; then
    echo -e "${RED}Error: This installer requires Ubuntu${NC}"
    exit 1
fi

source /etc/lsb-release
echo -e "${GREEN}System detected: $DISTRIB_ID $DISTRIB_RELEASE${NC}"
echo ""

# Get email
while true; do
    read -p "Enter admin email: " EMAIL
    if [[ "$EMAIL" =~ ^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$ ]]; then
        break
    fi
    echo -e "${RED}Invalid email format${NC}"
done

# Ask about components
echo ""
echo -e "${CYAN}Select components to install:${NC}"
echo ""

read -p "Install HAProxy load balancer? [y/N]: " haproxy_answer
HAPROXY="no"
[[ "$haproxy_answer" =~ ^[Yy] ]] && HAPROXY="yes"

read -p "Install MongoDB? [y/N]: " mongodb_answer
MONGODB="no"
[[ "$mongodb_answer" =~ ^[Yy] ]] && MONGODB="yes"

read -p "Install Node.js with PM2? [y/N]: " nodejs_answer
NODEJS="no"
[[ "$nodejs_answer" =~ ^[Yy] ]] && NODEJS="yes"

read -p "Install Python with Gunicorn? [y/N]: " python_answer
PYTHON="no"
[[ "$python_answer" =~ ^[Yy] ]] && PYTHON="yes"

# Confirm
echo ""
echo -e "${CYAN}Installation Summary:${NC}"
echo "  Email:    $EMAIL"
echo "  HAProxy:  $HAPROXY"
echo "  MongoDB:  $MONGODB"
echo "  Node.js:  $NODEJS"
echo "  Python:   $PYTHON"
echo ""

read -p "Start installation? [Y/n]: " confirm
if [[ "$confirm" =~ ^[Nn] ]]; then
    echo "Installation cancelled."
    exit 0
fi

# Build command
CMD="bash $INSTALL_DIR/vhst-install.sh"
CMD+=" --email $EMAIL"
CMD+=" --haproxy $HAPROXY"
CMD+=" --mongodb $MONGODB"
CMD+=" --nodejs $NODEJS"
CMD+=" --python $PYTHON"
CMD+=" --interactive no"
CMD+=" -f"

echo ""
echo -e "${GREEN}Starting installation...${NC}"
echo -e "${YELLOW}Command: $CMD${NC}"
echo ""

# Run installer
eval $CMD
