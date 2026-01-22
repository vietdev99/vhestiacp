#!/bin/bash
#==========================================================================
# VHestiaCP - Path Conversion Script
#
# Converts all paths from hestia to vhestia across the codebase
# Run this ONCE before building the standalone package
#==========================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "   VHestiaCP Path Conversion Script"
echo "=============================================="
echo ""
echo "Project directory: $PROJECT_DIR"
echo ""

# Dry run mode
DRY_RUN="${1:-no}"
if [ "$DRY_RUN" = "--dry-run" ] || [ "$DRY_RUN" = "-n" ]; then
    DRY_RUN="yes"
    echo -e "${YELLOW}DRY RUN MODE - No changes will be made${NC}"
    echo ""
fi

# Count occurrences before conversion
count_occurrences() {
    local pattern="$1"
    local dir="$2"
    grep -r "$pattern" "$dir" 2>/dev/null | wc -l || echo "0"
}

# Replace in files function
replace_in_files() {
    local dir="$1"
    local find_pattern="$2"
    local replace_pattern="$3"
    local file_pattern="${4:-*}"

    if [ "$DRY_RUN" = "yes" ]; then
        echo "  Would replace '$find_pattern' -> '$replace_pattern' in $dir ($file_pattern)"
        return
    fi

    # Use find with -type f to only process files
    find "$dir" -type f -name "$file_pattern" ! -path "*/node_modules/*" ! -path "*/.git/*" ! -path "*/dist/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done
}

# Replace in specific file types
replace_in_shell_scripts() {
    local dir="$1"
    local find_pattern="$2"
    local replace_pattern="$3"

    if [ "$DRY_RUN" = "yes" ]; then
        echo "  Would replace '$find_pattern' -> '$replace_pattern' in shell scripts under $dir"
        return
    fi

    # Process v-* scripts (no extension)
    find "$dir" -type f -name "v-*" ! -path "*/node_modules/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done

    # Process .sh files
    find "$dir" -type f -name "*.sh" ! -path "*/node_modules/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done
}

replace_in_js_files() {
    local dir="$1"
    local find_pattern="$2"
    local replace_pattern="$3"

    if [ "$DRY_RUN" = "yes" ]; then
        echo "  Would replace '$find_pattern' -> '$replace_pattern' in JS files under $dir"
        return
    fi

    find "$dir" -type f \( -name "*.js" -o -name "*.cjs" -o -name "*.mjs" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/dist/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done
}

replace_in_php_files() {
    local dir="$1"
    local find_pattern="$2"
    local replace_pattern="$3"

    if [ "$DRY_RUN" = "yes" ]; then
        echo "  Would replace '$find_pattern' -> '$replace_pattern' in PHP files under $dir"
        return
    fi

    find "$dir" -type f -name "*.php" ! -path "*/node_modules/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done
}

replace_in_tpl_files() {
    local dir="$1"
    local find_pattern="$2"
    local replace_pattern="$3"

    if [ "$DRY_RUN" = "yes" ]; then
        echo "  Would replace '$find_pattern' -> '$replace_pattern' in template files under $dir"
        return
    fi

    find "$dir" -type f \( -name "*.tpl" -o -name "*.stpl" -o -name "*.conf" -o -name "*.inc" \) ! -path "*/node_modules/*" 2>/dev/null | while read -r file; do
        if grep -q "$find_pattern" "$file" 2>/dev/null; then
            sed -i "s|$find_pattern|$replace_pattern|g" "$file"
        fi
    done
}

echo -e "${BLUE}[1/6] Counting current occurrences...${NC}"
echo "  /usr/local/hestia: $(count_occurrences '/usr/local/hestia' "$PROJECT_DIR")"
echo "  /etc/hestiacp: $(count_occurrences '/etc/hestiacp' "$PROJECT_DIR")"
echo ""

echo -e "${BLUE}[2/6] Converting bin/ scripts...${NC}"
if [ -d "$PROJECT_DIR/bin" ]; then
    replace_in_shell_scripts "$PROJECT_DIR/bin" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/bin" "/etc/hestiacp" "/etc/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/bin" "hestiacp/hestia.conf" "vhestia/vhestia.conf"
    echo -e "  ${GREEN}✓${NC} bin/ converted"
else
    echo -e "  ${YELLOW}⚠${NC} bin/ directory not found"
fi

echo -e "${BLUE}[3/6] Converting func/ libraries...${NC}"
if [ -d "$PROJECT_DIR/func" ]; then
    replace_in_shell_scripts "$PROJECT_DIR/func" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/func" "/etc/hestiacp" "/etc/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/func" "hestiacp/hestia.conf" "vhestia/vhestia.conf"
    echo -e "  ${GREEN}✓${NC} func/ converted"
else
    echo -e "  ${YELLOW}⚠${NC} func/ directory not found"
fi

echo -e "${BLUE}[4/6] Converting install/ scripts and templates...${NC}"
if [ -d "$PROJECT_DIR/install" ]; then
    # Shell scripts
    replace_in_shell_scripts "$PROJECT_DIR/install" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/install" "/etc/hestiacp" "/etc/vhestia"
    replace_in_shell_scripts "$PROJECT_DIR/install" "hestiacp/hestia.conf" "vhestia/vhestia.conf"

    # Template files
    replace_in_tpl_files "$PROJECT_DIR/install" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_tpl_files "$PROJECT_DIR/install" "/etc/hestiacp" "/etc/vhestia"

    # PHP files
    replace_in_php_files "$PROJECT_DIR/install" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_php_files "$PROJECT_DIR/install" "/etc/hestiacp" "/etc/vhestia"

    echo -e "  ${GREEN}✓${NC} install/ converted"
else
    echo -e "  ${YELLOW}⚠${NC} install/ directory not found"
fi

echo -e "${BLUE}[5/6] Converting web_v2/ files...${NC}"
if [ -d "$PROJECT_DIR/web_v2" ]; then
    replace_in_js_files "$PROJECT_DIR/web_v2" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_js_files "$PROJECT_DIR/web_v2" "/etc/hestiacp" "/etc/vhestia"
    echo -e "  ${GREEN}✓${NC} web_v2/ converted"
else
    echo -e "  ${YELLOW}⚠${NC} web_v2/ directory not found"
fi

echo -e "${BLUE}[6/6] Converting web/ PHP files (2FA, mail-wrapper)...${NC}"
if [ -d "$PROJECT_DIR/web" ]; then
    replace_in_php_files "$PROJECT_DIR/web" "/usr/local/hestia" "/usr/local/vhestia"
    replace_in_php_files "$PROJECT_DIR/web" "/etc/hestiacp" "/etc/vhestia"
    echo -e "  ${GREEN}✓${NC} web/ converted"
else
    echo -e "  ${YELLOW}⚠${NC} web/ directory not found"
fi

echo ""
if [ "$DRY_RUN" != "yes" ]; then
    echo -e "${BLUE}Verifying conversion...${NC}"
    remaining_hestia=$(count_occurrences '/usr/local/hestia' "$PROJECT_DIR")
    remaining_etc=$(count_occurrences '/etc/hestiacp' "$PROJECT_DIR")
    echo "  Remaining /usr/local/hestia: $remaining_hestia"
    echo "  Remaining /etc/hestiacp: $remaining_etc"

    if [ "$remaining_hestia" -gt 0 ] || [ "$remaining_etc" -gt 0 ]; then
        echo ""
        echo -e "${YELLOW}Note: Some occurrences may be in:${NC}"
        echo "  - node_modules/ (ignored)"
        echo "  - .git/ (ignored)"
        echo "  - dist/ (ignored)"
        echo "  - Comments or documentation"
        echo "  - External URLs (hestiacp.com)"
    fi
fi

echo ""
echo "=============================================="
echo "   Conversion Complete!"
echo "=============================================="
echo ""
echo "Next steps:"
echo "  1. Review changes: git diff"
echo "  2. Run: mv src/deb/hestia src/deb/vhestia"
echo "  3. Update src/deb/vhestia/control"
echo "  4. Run build-packages.sh"
echo ""
