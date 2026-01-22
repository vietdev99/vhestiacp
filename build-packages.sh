#!/bin/bash
#==========================================================================
# VHestiaCP - Standalone Package Builder
#
# This script builds the vhestia .deb package without depending on HestiaCP
# Usage: ./build-packages.sh [version]
#==========================================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
VERSION="${1:-2.0.0}"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="/tmp/vhestia-build-$$"
OUTPUT_DIR="${SCRIPT_DIR}/debs"
ARCHITECTURE="amd64"

echo ""
echo "=============================================="
echo "   VHestiaCP Standalone Package Builder"
echo "=============================================="
echo ""
echo "Version:      $VERSION"
echo "Architecture: $ARCHITECTURE"
echo "Output:       $OUTPUT_DIR"
echo ""

# Cleanup function
cleanup() {
    if [ -d "$BUILD_DIR" ]; then
        rm -rf "$BUILD_DIR"
    fi
}
trap cleanup EXIT

#----------------------------------------------------------#
# Step 1: Prepare build directory
#----------------------------------------------------------#

echo -e "${BLUE}[1/5] Preparing build directory...${NC}"

rm -rf "$BUILD_DIR"
mkdir -p "$BUILD_DIR/vhestia/DEBIAN"
mkdir -p "$BUILD_DIR/vhestia/usr/local/vhestia"
mkdir -p "$BUILD_DIR/vhestia/etc/vhestia"
mkdir -p "$OUTPUT_DIR"

PKG="$BUILD_DIR/vhestia"

echo -e "  ${GREEN}✓${NC} Build directory created"

#----------------------------------------------------------#
# Step 2: Copy core files
#----------------------------------------------------------#

echo -e "${BLUE}[2/5] Copying core files...${NC}"

# Copy bin scripts
if [ -d "$SCRIPT_DIR/bin" ]; then
    cp -r "$SCRIPT_DIR/bin" "$PKG/usr/local/vhestia/"
    BIN_COUNT=$(find "$PKG/usr/local/vhestia/bin" -type f | wc -l)
    echo -e "  ${GREEN}✓${NC} bin/ copied ($BIN_COUNT scripts)"
else
    echo -e "  ${RED}✗${NC} bin/ directory not found!"
    exit 1
fi

# Copy func libraries
if [ -d "$SCRIPT_DIR/func" ]; then
    cp -r "$SCRIPT_DIR/func" "$PKG/usr/local/vhestia/"
    echo -e "  ${GREEN}✓${NC} func/ copied"
else
    echo -e "  ${RED}✗${NC} func/ directory not found!"
    exit 1
fi

# Copy install directory
if [ -d "$SCRIPT_DIR/install" ]; then
    cp -r "$SCRIPT_DIR/install" "$PKG/usr/local/vhestia/"
    echo -e "  ${GREEN}✓${NC} install/ copied"
else
    echo -e "  ${YELLOW}⚠${NC} install/ directory not found, skipping"
fi

#----------------------------------------------------------#
# Step 3: Copy web components (only needed parts)
#----------------------------------------------------------#

echo -e "${BLUE}[3/5] Copying web components...${NC}"

# Create web directory structure
mkdir -p "$PKG/usr/local/vhestia/web/inc"

# Copy only essential web components (2FA, mail-wrapper)
if [ -d "$SCRIPT_DIR/web/inc/2fa" ]; then
    cp -r "$SCRIPT_DIR/web/inc/2fa" "$PKG/usr/local/vhestia/web/inc/"
    echo -e "  ${GREEN}✓${NC} web/inc/2fa/ copied"
fi

if [ -f "$SCRIPT_DIR/web/inc/mail-wrapper.php" ]; then
    cp "$SCRIPT_DIR/web/inc/mail-wrapper.php" "$PKG/usr/local/vhestia/web/inc/"
    echo -e "  ${GREEN}✓${NC} web/inc/mail-wrapper.php copied"
fi

# Copy API directory if exists (some scripts may need it)
if [ -d "$SCRIPT_DIR/web/api" ]; then
    cp -r "$SCRIPT_DIR/web/api" "$PKG/usr/local/vhestia/web/"
    echo -e "  ${GREEN}✓${NC} web/api/ copied"
fi

# Note: Old PHP panel (web/templates, web/css, etc.) is NOT copied
# VHestiaCP uses web_v2 (React+Express) which is installed separately
echo -e "  ${YELLOW}ℹ${NC} Old PHP panel excluded (using web_v2)"

#----------------------------------------------------------#
# Step 4: Create DEBIAN package files
#----------------------------------------------------------#

echo -e "${BLUE}[4/5] Creating DEBIAN package files...${NC}"

# Copy control files
if [ -d "$SCRIPT_DIR/src/deb/vhestia" ]; then
    cp "$SCRIPT_DIR/src/deb/vhestia/control" "$PKG/DEBIAN/"
    cp "$SCRIPT_DIR/src/deb/vhestia/postinst" "$PKG/DEBIAN/"
    cp "$SCRIPT_DIR/src/deb/vhestia/preinst" "$PKG/DEBIAN/"

    if [ -f "$SCRIPT_DIR/src/deb/vhestia/copyright" ]; then
        cp "$SCRIPT_DIR/src/deb/vhestia/copyright" "$PKG/DEBIAN/"
    fi

    echo -e "  ${GREEN}✓${NC} DEBIAN files copied"
else
    echo -e "  ${RED}✗${NC} src/deb/vhestia/ not found!"
    exit 1
fi

# Update version in control file
sed -i "s/^Version:.*/Version: $VERSION/" "$PKG/DEBIAN/control"
echo -e "  ${GREEN}✓${NC} Version set to $VERSION"

# Set permissions on DEBIAN scripts
chmod 755 "$PKG/DEBIAN/postinst"
chmod 755 "$PKG/DEBIAN/preinst"

# Set permissions on bin scripts
chmod -R 755 "$PKG/usr/local/vhestia/bin"

# Set permissions on func (readable, directory executable)
find "$PKG/usr/local/vhestia/func" -type f -exec chmod 644 {} \;
find "$PKG/usr/local/vhestia/func" -type d -exec chmod 755 {} \;

echo -e "  ${GREEN}✓${NC} Permissions set"

#----------------------------------------------------------#
# Step 5: Build the package
#----------------------------------------------------------#

echo -e "${BLUE}[5/5] Building package...${NC}"

# Calculate installed size (in KB)
INSTALLED_SIZE=$(du -sk "$PKG/usr" | cut -f1)
sed -i "s/^Installed-Size:.*/Installed-Size: $INSTALLED_SIZE/" "$PKG/DEBIAN/control" 2>/dev/null || \
    echo "Installed-Size: $INSTALLED_SIZE" >> "$PKG/DEBIAN/control"

# Build the package
OUTPUT_FILE="$OUTPUT_DIR/vhestia_${VERSION}_${ARCHITECTURE}.deb"
dpkg-deb --build "$PKG" "$OUTPUT_FILE"

if [ -f "$OUTPUT_FILE" ]; then
    PKG_SIZE=$(ls -lh "$OUTPUT_FILE" | awk '{print $5}')
    echo -e "  ${GREEN}✓${NC} Package built successfully"
else
    echo -e "  ${RED}✗${NC} Package build failed!"
    exit 1
fi

#----------------------------------------------------------#
# Summary
#----------------------------------------------------------#

echo ""
echo "=============================================="
echo "   Build Complete!"
echo "=============================================="
echo ""
echo "Package: $OUTPUT_FILE"
echo "Size:    $PKG_SIZE"
echo "Version: $VERSION"
echo ""
echo "Contents:"
echo "  - bin/     : $BIN_COUNT scripts"
echo "  - func/    : Shell function libraries"
echo "  - install/ : Installation scripts and templates"
echo "  - web/     : Essential components only (2FA, mail-wrapper)"
echo ""
echo "To install on a fresh Ubuntu server:"
echo "  1. Copy the package to the server"
echo "  2. Run: sudo dpkg -i vhestia_${VERSION}_${ARCHITECTURE}.deb"
echo "  3. Run: sudo apt-get install -f  # Install dependencies"
echo "  4. Run the installer: bash /usr/local/vhestia/install/vhst-install.sh"
echo ""
echo "For development/testing:"
echo "  scp $OUTPUT_FILE root@your-server:/tmp/"
echo "  ssh root@your-server 'dpkg -i /tmp/vhestia_${VERSION}_${ARCHITECTURE}.deb'"
echo ""
