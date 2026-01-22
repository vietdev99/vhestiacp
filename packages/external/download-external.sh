#!/bin/bash
#===========================================================================#
# VHestiaCP External Package Downloader
# Downloads external packages that were previously fetched from HestiaCP
#===========================================================================#

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# phpPgAdmin version
PGA_VERSION="7.14.7"

echo "Downloading external packages for VHestiaCP..."
echo ""

# Create downloads directory
mkdir -p "$SCRIPT_DIR/downloads"
cd "$SCRIPT_DIR/downloads"

#----------------------------------------------------------#
# phpPgAdmin - PostgreSQL Web Admin
#----------------------------------------------------------#
echo "[ 1/1 ] Downloading phpPgAdmin v${PGA_VERSION}..."

# Try official phpPgAdmin repo first, then HestiaCP fork as fallback
if wget -q --show-progress "https://github.com/phppgadmin/phppgadmin/releases/download/REL_7-14-7/phpPgAdmin-${PGA_VERSION}.tar.gz" -O "phppgadmin-v${PGA_VERSION}.tar.gz"; then
    echo "  Downloaded from official phpPgAdmin repo"
else
    echo "  Official repo failed, trying alternative..."
    # Alternative: download from GitHub archive
    wget -q --show-progress "https://github.com/phppgadmin/phppgadmin/archive/refs/tags/REL_7-14-7.tar.gz" -O "phppgadmin-v${PGA_VERSION}.tar.gz" || {
        echo "  ERROR: Failed to download phpPgAdmin"
        exit 1
    }
fi

# Verify download
if [ -f "phppgadmin-v${PGA_VERSION}.tar.gz" ]; then
    echo "  ✓ phpPgAdmin downloaded successfully"
    ls -lh "phppgadmin-v${PGA_VERSION}.tar.gz"
else
    echo "  ✗ Failed to download phpPgAdmin"
    exit 1
fi

echo ""
echo "All external packages downloaded to: $SCRIPT_DIR/downloads/"
echo ""
