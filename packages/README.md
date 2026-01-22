# VHestiaCP Packages

This directory contains tools for downloading, modifying, and repacking HestiaCP Debian packages as VHestiaCP packages.

## Directory Structure

```
packages/
├── download-debs.sh     # Download HestiaCP packages from apt.hestiacp.com
├── extract-deb.sh       # Extract .deb for modification
├── repack-deb.sh        # Repack modified package
├── deb/                 # Downloaded .deb files (gitignored)
│   └── jammy/           # Ubuntu 22.04 packages
└── extracted/           # Extracted packages for modification (gitignored)
```

## Workflow

### 1. Download HestiaCP Packages

```bash
# Download latest packages for Ubuntu 22.04 (jammy)
./download-debs.sh jammy

# Other distros:
./download-debs.sh focal      # Ubuntu 20.04
./download-debs.sh bookworm   # Debian 12
./download-debs.sh bullseye   # Debian 11
```

### 2. Extract Package for Modification

```bash
# Extract main hestia package
./extract-deb.sh deb/jammy/hestia_1.9.4_amd64.deb
```

This creates `extracted/hestia/` with:
- `DEBIAN/control` - Package metadata
- `DEBIAN/postinst` - Post-install script
- `usr/local/hestia/` - Application files

### 3. Modify Package

Key modifications for VHestiaCP:

**DEBIAN/control:**
```
Package: vhestia
Version: 2.0.1
Maintainer: VHestiaCP <info@vhestiacp.com>
Description: VHestiaCP Control Panel
```

**usr/local/hestia/:**
- Replace `web/` with `web_v2/` (React panel)
- Add VHestiaCP-specific scripts
- Update branding

### 4. Repack as VHestiaCP

```bash
./repack-deb.sh extracted/hestia vhestia_2.0.1_amd64.deb
```

## Package Contents

| Package | Size | Contents |
|---------|------|----------|
| hestia | ~2MB | Main panel: bin/, func/, web/, templates |
| hestia-nginx | ~3.5MB | Nginx binary with custom modules |
| hestia-php | ~59MB | PHP-FPM binary |

## Notes

- `.deb` files are **gitignored** (too large)
- Run these scripts on Linux (or WSL on Windows)
- `dpkg-deb` is preferred but scripts have fallback to `ar` + `tar`
