#!/bin/bash
#==========================================================================
# VHestiaCP Complete Fix Script
# Fixes HAProxy save/restart permissions issue
#==========================================================================

echo "=============================================="
echo "VHestiaCP Complete Fix Script"
echo "=============================================="
echo ""

HESTIA="/usr/local/hestia"

# Check if running as root
if [ "$(id -u)" != "0" ]; then
   echo "Error: This script must be run as root"
   exit 1
fi

echo "[1/6] Updating sudoers..."
cat > /etc/sudoers.d/hestiaweb << 'EOF'
Defaults:root !requiretty
Defaults:hestiaweb !requiretty

# Allow hestiaweb to run hestia scripts
hestiaweb   ALL=NOPASSWD:/usr/local/hestia/bin/*

# VHestiaCP: Allow direct service management as fallback
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl reload-or-restart haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl reload haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl start haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl stop haproxy
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart redis-server
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart rabbitmq-server
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart kafka
hestiaweb   ALL=NOPASSWD:/usr/bin/systemctl restart mongod
EOF
chmod 440 /etc/sudoers.d/hestiaweb
echo "    ✓ Sudoers updated"

echo ""
echo "[2/6] Creating v-update-sys-haproxy-config script..."
cat > "$HESTIA/bin/v-update-sys-haproxy-config" << 'SCRIPT'
#!/bin/bash
# info: update HAProxy configuration
# options: CONFIG_FILE
#
# This function updates HAProxy configuration and restarts the service

config_input=$1

# Includes
source /etc/hestiacp/hestia.conf
source $HESTIA/func/main.sh
source_conf "$HESTIA/conf/hestia.conf"

# Check args
if [ -z "$config_input" ]; then
    echo "Error: Config file path required"
    exit 1
fi

# Check if input file exists
if [ ! -f "$config_input" ]; then
    echo "Error: Input config file not found: $config_input"
    exit 1
fi

# Check if HAProxy is installed
if [ ! -f "/etc/haproxy/haproxy.cfg" ]; then
    echo "Error: HAProxy is not installed"
    exit 1
fi

# Validate the new configuration
/usr/sbin/haproxy -c -f "$config_input" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Error: Invalid HAProxy configuration"
    exit 1
fi

# Backup current config
cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak

# Apply new config
cp "$config_input" /etc/haproxy/haproxy.cfg
chmod 644 /etc/haproxy/haproxy.cfg

# Reload HAProxy - try multiple methods
if systemctl reload-or-restart haproxy 2>/dev/null; then
    echo "OK"
    exit 0
fi

# Fallback: try restart
if systemctl restart haproxy 2>/dev/null; then
    echo "OK"
    exit 0
fi

# Fallback: try service command
if service haproxy restart 2>/dev/null; then
    echo "OK"
    exit 0
fi

# If all failed, restore backup
cp /etc/haproxy/haproxy.cfg.bak /etc/haproxy/haproxy.cfg
systemctl restart haproxy 2>/dev/null
echo "Error: HAProxy failed to restart. Previous config restored."
exit 1
SCRIPT
chmod 755 "$HESTIA/bin/v-update-sys-haproxy-config"
echo "    ✓ Script created"

echo ""
echo "[3/6] Updating HAProxy main controller..."

# Backup original
cp "$HESTIA/web/edit/haproxy/index.php" "$HESTIA/web/edit/haproxy/index.php.bak" 2>/dev/null

cat > "$HESTIA/web/edit/haproxy/index.php" << 'PHPCODE'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

ob_start();
$TAB = "HAPROXY";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Check if HAProxy is installed
$haproxy_installed = false;
if (!empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") {
    $haproxy_installed = true;
}
if (!$haproxy_installed) {
    exec("which haproxy 2>/dev/null", $which_output, $which_return);
    if ($which_return === 0) $haproxy_installed = true;
}
if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) {
    $haproxy_installed = true;
}

if (!$haproxy_installed) {
    $_SESSION["error_msg"] = _("HAProxy is not installed");
    header("Location: /list/server/");
    exit();
}

$config_file = '/etc/haproxy/haproxy.cfg';
$v_config = "";

// Load current config
if (file_exists($config_file)) {
    $v_config = file_get_contents($config_file);
}

// Get HAProxy status
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? 'running' : 'stopped';

$v_stats_enabled = $_SESSION['HAPROXY_STATS'] ?? 'no';
$v_stats_port = $_SESSION['HAPROXY_STATS_PORT'] ?? '8404';
$v_stats_user = $_SESSION['HAPROXY_STATS_USER'] ?? 'admin';

// Handle POST
if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    
    if (!empty($_POST["v_config"])) {
        // Save config to temp file
        $temp_config = tempnam("/tmp", "haproxy_");
        file_put_contents($temp_config, $_POST["v_config"]);
        
        // Use Hestia script to validate, save, and restart
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        
        if ($return_var === 0) {
            $v_config = $_POST["v_config"];
            $_SESSION["ok_msg"] = _("HAProxy configuration has been saved and service restarted.");
        } else {
            $_SESSION["error_msg"] = _("Failed to update HAProxy: ") . implode("<br>", $output);
        }
        
        unlink($temp_config);
        unset($output);
    }
}

render_page($user, $TAB, "edit_haproxy");

unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
PHPCODE

echo "    ✓ Main controller updated"

echo ""
echo "[4/6] Updating HAProxy frontend controller..."
cat > "$HESTIA/web/edit/haproxy/frontend/index.php" << 'PHPCODE'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

$name = $_GET["name"] ?? "";
if (empty($name)) {
    header("Location: /list/haproxy/");
    exit();
}

$config_file = "/etc/haproxy/haproxy.cfg";

// Handle POST
if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    
    $new_name = trim($_POST["v_name"] ?? $name);
    $new_config = $_POST["v_config"] ?? "";
    
    if (!empty($new_name) && !empty($new_config)) {
        $config = file_get_contents($config_file);
        $pattern = '/^frontend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "frontend " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            $temp_config = tempnam("/tmp", "haproxy_fe_");
            file_put_contents($temp_config, $new_full_config);
            
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Frontend '%s' has been updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/");
                exit();
            } else {
                $_SESSION["error_msg"] = _("Failed to update: ") . implode("<br>", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Frontend '%s' not found."), htmlspecialchars($name));
        }
    }
}

// Parse config
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^frontend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) {
        $section_config = trim($matches[1]);
    }
}

$v_name = $name;
$v_config = $section_config;

render_page($user, $TAB, "edit_haproxy_section");
PHPCODE

echo "    ✓ Frontend controller updated"

echo ""
echo "[5/6] Updating HAProxy backend controller..."
cat > "$HESTIA/web/edit/haproxy/backend/index.php" << 'PHPCODE'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

$name = $_GET["name"] ?? "";
if (empty($name)) {
    header("Location: /list/haproxy/");
    exit();
}

$config_file = "/etc/haproxy/haproxy.cfg";

// Handle POST
if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    
    $new_name = trim($_POST["v_name"] ?? $name);
    $new_config = $_POST["v_config"] ?? "";
    
    if (!empty($new_name) && !empty($new_config)) {
        $config = file_get_contents($config_file);
        $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "backend " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            $temp_config = tempnam("/tmp", "haproxy_be_");
            file_put_contents($temp_config, $new_full_config);
            
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Backend '%s' has been updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/");
                exit();
            } else {
                $_SESSION["error_msg"] = _("Failed to update: ") . implode("<br>", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Backend '%s' not found."), htmlspecialchars($name));
        }
    }
}

// Parse config
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) {
        $section_config = trim($matches[1]);
    }
}

$v_name = $name;
$v_config = $section_config;
$v_section_type = "backend";

render_page($user, $TAB, "edit_haproxy_section");
PHPCODE

echo "    ✓ Backend controller updated"

echo ""
echo "[6/6] Updating HAProxy listen controller..."
cat > "$HESTIA/web/edit/haproxy/listen/index.php" << 'PHPCODE'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

$name = $_GET["name"] ?? "";
if (empty($name)) {
    header("Location: /list/haproxy/");
    exit();
}

$config_file = "/etc/haproxy/haproxy.cfg";

// Handle POST
if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    
    $new_name = trim($_POST["v_name"] ?? $name);
    $new_config = $_POST["v_config"] ?? "";
    
    if (!empty($new_name) && !empty($new_config)) {
        $config = file_get_contents($config_file);
        $pattern = '/^listen\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "listen " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            $temp_config = tempnam("/tmp", "haproxy_ls_");
            file_put_contents($temp_config, $new_full_config);
            
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Listen '%s' has been updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/");
                exit();
            } else {
                $_SESSION["error_msg"] = _("Failed to update: ") . implode("<br>", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Listen '%s' not found."), htmlspecialchars($name));
        }
    }
}

// Parse config
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^listen\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) {
        $section_config = trim($matches[1]);
    }
}

$v_name = $name;
$v_config = $section_config;
$v_section_type = "listen";

render_page($user, $TAB, "edit_haproxy_section");
PHPCODE

echo "    ✓ Listen controller updated"

echo ""
echo "=============================================="
echo "✅ Complete fix applied!"
echo ""
echo "Testing HAProxy restart..."
systemctl restart haproxy 2>&1
if [ $? -eq 0 ]; then
    echo "✓ HAProxy restart successful"
else
    echo "✗ HAProxy restart failed - check config"
fi
echo ""
echo "Please logout and login again to the admin panel."
echo "=============================================="
