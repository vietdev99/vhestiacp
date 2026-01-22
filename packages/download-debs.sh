#!/bin/bash
# Download HestiaCP .deb packages for modification
# These will be modified and repackaged as VHestiaCP packages

set -e

# Configuration
ARCH="amd64"
DISTRO="${1:-jammy}"  # jammy (22.04), focal (20.04), bookworm (debian 12), bullseye (debian 11)
OUTPUT_DIR="$(dirname "$0")/deb/${DISTRO}"

# Base URL
BASE_URL="https://apt.hestiacp.com"

# Create output directory
mkdir -p "$OUTPUT_DIR"

echo "========================================"
echo "Downloading HestiaCP packages for ${DISTRO}"
echo "========================================"
echo ""

# Get package list
echo "Fetching package list..."
PACKAGES_URL="${BASE_URL}/dists/${DISTRO}/main/binary-${ARCH}/Packages"
PACKAGES_LIST=$(curl -s "$PACKAGES_URL" 2>/dev/null)

if [ -z "$PACKAGES_LIST" ]; then
    echo "ERROR: Failed to fetch package list from ${PACKAGES_URL}"
    exit 1
fi

# Function to get latest version of a package
get_latest_package() {
    local pkg_name="$1"
    echo "$PACKAGES_LIST" | awk -v pkg="$pkg_name" '
        /^Package:/ { current_pkg = $2 }
        /^Version:/ { current_ver = $2 }
        /^Filename:/ {
            if (current_pkg == pkg) {
                print current_ver, $2
            }
        }
    ' | sort -V | tail -1
}

# Packages to download (main HestiaCP packages)
PACKAGE_NAMES=(
    "hestia"
    "hestia-nginx"
    "hestia-php"
)

echo "Finding latest versions..."
echo ""

for pkg_name in "${PACKAGE_NAMES[@]}"; do
    result=$(get_latest_package "$pkg_name")
    version=$(echo "$result" | awk '{print $1}')
    filename=$(echo "$result" | awk '{print $2}')

    if [ -z "$filename" ]; then
        echo "WARNING: Package $pkg_name not found"
        continue
    fi

    url="${BASE_URL}/${filename}"
    output_file="${OUTPUT_DIR}/$(basename "$filename")"

    echo "Package: $pkg_name"
    echo "  Version: $version"
    echo "  URL: $url"

    if [ -f "$output_file" ]; then
        echo "  Status: Already exists, skipping"
    else
        echo "  Downloading..."
        if curl -L -o "$output_file" "$url" 2>/dev/null; then
            size=$(ls -lh "$output_file" | awk '{print $5}')
            echo "  Downloaded: $size"
        else
            echo "  ERROR: Failed to download"
        fi
    fi
    echo ""
done

echo "========================================"
echo "Downloaded packages in ${OUTPUT_DIR}:"
ls -lh "$OUTPUT_DIR"/*.deb 2>/dev/null || echo "No packages downloaded"
echo "========================================"
echo ""
echo "To extract and modify a package:"
echo "  mkdir -p extracted/hestia"
echo "  dpkg-deb -R ${OUTPUT_DIR}/hestia_*.deb extracted/hestia/"
echo ""
echo "To repackage after modification:"
echo "  dpkg-deb -b extracted/hestia/ vhestia_2.0.1_amd64.deb"
