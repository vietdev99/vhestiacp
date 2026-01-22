#!/bin/bash
# Extract HestiaCP .deb package for modification
# Usage: ./extract-deb.sh <deb-file>

set -e

if [ -z "$1" ]; then
    echo "Usage: $0 <deb-file>"
    echo "Example: $0 deb/jammy/hestia_1.9.4_amd64.deb"
    exit 1
fi

DEB_FILE="$1"
SCRIPT_DIR="$(dirname "$0")"
EXTRACT_DIR="${SCRIPT_DIR}/extracted"

if [ ! -f "$DEB_FILE" ]; then
    echo "ERROR: File not found: $DEB_FILE"
    exit 1
fi

# Get package name from filename
PKG_NAME=$(basename "$DEB_FILE" | sed 's/_.*//; s/-/_/g')

echo "========================================"
echo "Extracting: $DEB_FILE"
echo "Output: ${EXTRACT_DIR}/${PKG_NAME}"
echo "========================================"

# Create extraction directory
mkdir -p "${EXTRACT_DIR}/${PKG_NAME}"
cd "${EXTRACT_DIR}/${PKG_NAME}"

# Extract using dpkg-deb (preferred) or ar+tar
if command -v dpkg-deb &> /dev/null; then
    echo "Using dpkg-deb..."
    dpkg-deb -R "../../$(basename "$DEB_FILE" | sed "s|^|deb/jammy/|")" .
else
    echo "Using ar + tar..."

    # Extract the .deb archive
    ar x "../../$DEB_FILE"

    # Extract control.tar.* (metadata)
    echo "Extracting control..."
    mkdir -p DEBIAN
    if [ -f control.tar.xz ]; then
        tar -xf control.tar.xz -C DEBIAN
    elif [ -f control.tar.gz ]; then
        tar -xf control.tar.gz -C DEBIAN
    elif [ -f control.tar.zst ]; then
        zstd -d control.tar.zst -o control.tar
        tar -xf control.tar -C DEBIAN
        rm control.tar
    fi

    # Extract data.tar.* (files)
    echo "Extracting data..."
    if [ -f data.tar.xz ]; then
        tar -xf data.tar.xz
    elif [ -f data.tar.gz ]; then
        tar -xf data.tar.gz
    elif [ -f data.tar.zst ]; then
        zstd -d data.tar.zst -o data.tar
        tar -xf data.tar
        rm data.tar
    fi

    # Clean up
    rm -f debian-binary control.tar.* data.tar.*
fi

echo ""
echo "========================================"
echo "Extraction complete!"
echo "========================================"
echo ""
echo "Directory structure:"
find . -maxdepth 3 -type d | head -20
echo ""
echo "Key files to modify:"
echo "  DEBIAN/control    - Package metadata (name, version, description)"
echo "  DEBIAN/postinst   - Post-installation script"
echo "  usr/local/hestia/ - Main application files"
