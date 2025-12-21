#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP Installation Script                                    #
#          Based on HestiaCP - https://hestiacp.com                         #
#                                                                           #
#          Extended features:                                               #
#          - HAProxy Load Balancer                                          #
#          - MongoDB Database Server                                        #
#          - Node.js + PM2 Process Manager                                  #
#          - Python + Gunicorn                                              #
#          - Modern nginx templates                                         #
#                                                                           #
#===========================================================================#

VHESTIA_VERSION="1.0.0"

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

#----------------------------------------------------------#
#                    Fix Locale Issues                     #
#----------------------------------------------------------#

export LANGUAGE=en_US.UTF-8
export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8

# Generate locale if not exists
if ! locale -a 2>/dev/null | grep -q "en_US.utf8"; then
    locale-gen en_US.UTF-8 >/dev/null 2>&1 || true
    update-locale LANG=en_US.UTF-8 >/dev/null 2>&1 || true
fi

#----------------------------------------------------------#
#                    Verify Requirements                   #
#----------------------------------------------------------#

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

# Check Ubuntu
if [ ! -f /etc/lsb-release ]; then
    echo "Error: This installer requires Ubuntu"
    exit 1
fi

source /etc/lsb-release
if [ "$DISTRIB_ID" != "Ubuntu" ]; then
    echo "Error: This installer requires Ubuntu (found: $DISTRIB_ID)"
    exit 1
fi

# Check installer exists
if [ ! -f "$SCRIPT_DIR/hst-install-ubuntu.sh" ]; then
    echo "Error: hst-install-ubuntu.sh not found in $SCRIPT_DIR"
    exit 1
fi

#----------------------------------------------------------#
#                    Show Banner                           #
#----------------------------------------------------------#

clear
echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║                                                               ║"
echo "║     ██╗   ██╗██╗  ██╗███████╗███████╗████████╗██╗ █████╗      ║"
echo "║     ██║   ██║██║  ██║██╔════╝██╔════╝╚══██╔══╝██║██╔══██╗     ║"
echo "║     ██║   ██║███████║█████╗  ███████╗   ██║   ██║███████║     ║"
echo "║     ╚██╗ ██╔╝██╔══██║██╔══╝  ╚════██║   ██║   ██║██╔══██║     ║"
echo "║      ╚████╔╝ ██║  ██║███████╗███████║   ██║   ██║██║  ██║     ║"
echo "║       ╚═══╝  ╚═╝  ╚═╝╚══════╝╚══════╝   ╚═╝   ╚═╝╚═╝  ╚═╝     ║"
echo "║                                                               ║"
echo "║         VHestiaCP - Extended Control Panel v$VHESTIA_VERSION               ║"
echo "║         Based on HestiaCP - https://hestiacp.com              ║"
echo "║                                                               ║"
echo "║   Features: HAProxy | MongoDB | Node.js/PM2 | Python/Gunicorn ║"
echo "║                                                               ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

#----------------------------------------------------------#
#                    Run Main Installer                    #
#----------------------------------------------------------#

# Pass all arguments to the main installer
exec bash "$SCRIPT_DIR/hst-install-ubuntu.sh" "$@"
