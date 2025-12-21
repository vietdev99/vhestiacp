#!/bin/bash
#==========================================================================
# VHestiaCP - Build Debian Packages
# 
# This script builds the hestia, hestia-nginx, hestia-php packages
# that can be used with --with-debs option or uploaded to GitHub releases
#==========================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="/tmp/vhestiacp-build"
OUTPUT_DIR="${SCRIPT_DIR}/debs"
VERSION="${1:-1.9.4}"

echo ""
echo "=============================================="
echo "   VHestiaCP Package Builder"
echo "=============================================="
echo ""
echo "Version: $VERSION"
echo "Output:  $OUTPUT_DIR"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Install build dependencies
echo -e "${BLUE}[1/5] Installing build dependencies...${NC}"
apt-get update -qq
apt-get install -y build-essential devscripts debhelper git curl > /dev/null 2>&1
echo -e "  ${GREEN}✓${NC} Dependencies installed"

# Clone HestiaCP source
echo ""
echo -e "${BLUE}[2/5] Cloning HestiaCP source...${NC}"
rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR"

git clone --depth 1 https://github.com/hestiacp/hestiacp.git source > /dev/null 2>&1
echo -e "  ${GREEN}✓${NC} Source cloned"

# Apply VHestiaCP modifications
echo ""
echo -e "${BLUE}[3/5] Applying VHestiaCP modifications...${NC}"

# Copy VHestiaCP files over HestiaCP
if [ -d "$SCRIPT_DIR/bin" ]; then
    cp -rf "$SCRIPT_DIR/bin/"* "$BUILD_DIR/source/bin/" 2>/dev/null || true
fi
if [ -d "$SCRIPT_DIR/func" ]; then
    cp -rf "$SCRIPT_DIR/func/"* "$BUILD_DIR/source/func/" 2>/dev/null || true
fi
if [ -d "$SCRIPT_DIR/web" ]; then
    cp -rf "$SCRIPT_DIR/web/"* "$BUILD_DIR/source/web/" 2>/dev/null || true
fi
if [ -d "$SCRIPT_DIR/install" ]; then
    cp -rf "$SCRIPT_DIR/install/"* "$BUILD_DIR/source/install/" 2>/dev/null || true
fi

echo -e "  ${GREEN}✓${NC} VHestiaCP modifications applied"

# Build packages
echo ""
echo -e "${BLUE}[4/5] Building packages...${NC}"
cd "$BUILD_DIR/source"

# Update version in control file
sed -i "s/Version:.*/Version: $VERSION/" src/deb/hestia/control 2>/dev/null || true

# Build hestia package
echo "  Building hestia..."
cd src/deb
if [ -f "./hst_autocompile.sh" ]; then
    # Use official build script if available
    bash ./hst_autocompile.sh --hestia --noinstall --keepbuild 2>&1 | tail -5
else
    # Manual build
    dpkg-deb --build hestia "${BUILD_DIR}/hestia_${VERSION}_all.deb" 2>/dev/null || true
fi

echo -e "  ${GREEN}✓${NC} Packages built"

# Copy to output
echo ""
echo -e "${BLUE}[5/5] Copying packages to output...${NC}"
mkdir -p "$OUTPUT_DIR"

# Find and copy built packages
find "$BUILD_DIR" -name "hestia*.deb" -exec cp {} "$OUTPUT_DIR/" \; 2>/dev/null || true

# List output
echo ""
echo "Built packages:"
ls -la "$OUTPUT_DIR/"*.deb 2>/dev/null || echo "  No packages found"

echo ""
echo "=============================================="
echo "   Build Complete!"
echo "=============================================="
echo ""
echo "To install with these packages, run:"
echo "  bash install/vhst-install.sh --with-debs $OUTPUT_DIR -f"
echo ""
echo "To upload to GitHub releases:"
echo "  1. Create a new release on your GitHub repo"
echo "  2. Upload the .deb files from $OUTPUT_DIR"
echo "  3. Install with: bash install/vhst-install.sh --github-repo YOUR/REPO --github-release yes -f"
echo ""
