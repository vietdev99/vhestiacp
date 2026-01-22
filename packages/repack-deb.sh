#!/bin/bash
# Repack modified package as VHestiaCP .deb
# Usage: ./repack-deb.sh <extracted-dir> <output-deb>

set -e

if [ -z "$1" ] || [ -z "$2" ]; then
    echo "Usage: $0 <extracted-dir> <output-deb>"
    echo "Example: $0 extracted/hestia vhestia_2.0.1_amd64.deb"
    exit 1
fi

EXTRACT_DIR="$1"
OUTPUT_DEB="$2"
SCRIPT_DIR="$(dirname "$0")"

if [ ! -d "$EXTRACT_DIR" ]; then
    echo "ERROR: Directory not found: $EXTRACT_DIR"
    exit 1
fi

if [ ! -d "${EXTRACT_DIR}/DEBIAN" ]; then
    echo "ERROR: DEBIAN directory not found in $EXTRACT_DIR"
    exit 1
fi

echo "========================================"
echo "Repacking: $EXTRACT_DIR"
echo "Output: $OUTPUT_DEB"
echo "========================================"

# Fix permissions
echo "Fixing permissions..."
find "$EXTRACT_DIR" -type d -exec chmod 755 {} \;
find "$EXTRACT_DIR/DEBIAN" -type f -exec chmod 644 {} \;
chmod 755 "$EXTRACT_DIR/DEBIAN/postinst" 2>/dev/null || true
chmod 755 "$EXTRACT_DIR/DEBIAN/preinst" 2>/dev/null || true
chmod 755 "$EXTRACT_DIR/DEBIAN/postrm" 2>/dev/null || true
chmod 755 "$EXTRACT_DIR/DEBIAN/prerm" 2>/dev/null || true

# Repack using dpkg-deb (preferred) or ar+tar
if command -v dpkg-deb &> /dev/null; then
    echo "Using dpkg-deb..."
    dpkg-deb -b "$EXTRACT_DIR" "$OUTPUT_DEB"
else
    echo "Using ar + tar..."

    TEMP_DIR=$(mktemp -d)

    # Create debian-binary
    echo "2.0" > "${TEMP_DIR}/debian-binary"

    # Create control.tar.xz
    echo "Creating control.tar.xz..."
    (cd "${EXTRACT_DIR}/DEBIAN" && tar -cJf "${TEMP_DIR}/control.tar.xz" .)

    # Create data.tar.xz
    echo "Creating data.tar.xz..."
    (cd "$EXTRACT_DIR" && tar -cJf "${TEMP_DIR}/data.tar.xz" --exclude='./DEBIAN' .)

    # Create .deb archive
    echo "Creating .deb archive..."
    (cd "$TEMP_DIR" && ar rcs "../$OUTPUT_DEB" debian-binary control.tar.xz data.tar.xz)

    # Clean up
    rm -rf "$TEMP_DIR"
fi

echo ""
echo "========================================"
echo "Package created: $OUTPUT_DEB"
ls -lh "$OUTPUT_DEB"
echo "========================================"
