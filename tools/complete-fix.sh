#!/bin/bash
#==========================================================================
# VHestiaCP Complete Fix Script
# Fixes HAProxy permissions for all operations (add/edit/delete)
#==========================================================================

HESTIA="/usr/local/hestia"

if [ "$(id -u)" != "0" ]; then
   echo "Error: Run as root"
   exit 1
fi

echo "=============================================="
echo "VHestiaCP Complete Fix Script"
echo "=============================================="
echo ""

echo "[1/9] Updating sudoers..."
cat > /etc/sudoers.d/hestiaweb << 'EOF'
Defaults:root !requiretty
Defaults:hestiaweb !requiretty
hestiaweb   ALL=NOPASSWD:/usr/local/hestia/bin/*
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
echo "    ✓ Done"

echo ""
echo "[2/9] Updating HESTIA_CMD in main.php..."
sed -i 's|define("HESTIA_CMD", "/usr/bin/sudo /usr/local/hestia/bin/");|define("HESTIA_CMD", "/usr/bin/sudo -n /usr/local/hestia/bin/");|g' "$HESTIA/web/inc/main.php"
echo "    ✓ Done"

echo ""
echo "[3/9] Creating v-update-sys-haproxy-config..."
cat > "$HESTIA/bin/v-update-sys-haproxy-config" << 'SCRIPTEOF'
#!/bin/bash
config_input=$1
source /etc/hestiacp/hestia.conf
source $HESTIA/func/main.sh
source_conf "$HESTIA/conf/hestia.conf"

[ -z "$config_input" ] && echo "Error: Config file required" && exit 1
[ ! -f "$config_input" ] && echo "Error: File not found" && exit 1
[ ! -f "/etc/haproxy/haproxy.cfg" ] && echo "Error: HAProxy not installed" && exit 1

/usr/sbin/haproxy -c -f "$config_input" > /dev/null 2>&1 || { echo "Error: Invalid config"; exit 1; }

cp /etc/haproxy/haproxy.cfg /etc/haproxy/haproxy.cfg.bak
cp "$config_input" /etc/haproxy/haproxy.cfg
chmod 644 /etc/haproxy/haproxy.cfg

systemctl reload-or-restart haproxy 2>/dev/null && echo "OK" && exit 0
systemctl restart haproxy 2>/dev/null && echo "OK" && exit 0

cp /etc/haproxy/haproxy.cfg.bak /etc/haproxy/haproxy.cfg
systemctl restart haproxy 2>/dev/null
echo "Error: Restart failed"
exit 1
SCRIPTEOF
chmod 755 "$HESTIA/bin/v-update-sys-haproxy-config"
echo "    ✓ Done"

echo ""
echo "[4/9] Updating edit controllers..."

# /edit/server/haproxy/index.php
cat > "$HESTIA/web/edit/server/haproxy/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "SERVER";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }

$haproxy_installed = false;
if (!empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") $haproxy_installed = true;
if (!$haproxy_installed) { exec("which haproxy 2>/dev/null", $o, $r); if ($r === 0) $haproxy_installed = true; }
if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) $haproxy_installed = true;
if (!$haproxy_installed) { $_SESSION["error_msg"] = _("HAProxy is not installed"); header("Location: /list/server/"); exit(); }

$config_file = '/etc/haproxy/haproxy.cfg';
$v_config = file_exists($config_file) ? file_get_contents($config_file) : "";
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? 'running' : 'stopped';

if (!empty($_POST["save"])) {
    verify_csrf($_POST);
    if (!empty($_POST["v_config"])) {
        $temp_config = tempnam("/tmp", "haproxy_srv_");
        file_put_contents($temp_config, $_POST["v_config"]);
        chmod($temp_config, 0644);
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        if ($return_var === 0) {
            $v_config = $_POST["v_config"];
            $_SESSION["ok_msg"] = _("HAProxy configuration saved and service restarted.");
        } else {
            $_SESSION["error_msg"] = _("Failed to update HAProxy: ") . implode("<br>", $output);
        }
        unlink($temp_config);
    }
}
render_page($user, $TAB, "edit_server_haproxy");
unset($_SESSION["error_msg"]); unset($_SESSION["ok_msg"]);
PHPEOF

# /edit/haproxy/index.php
cat > "$HESTIA/web/edit/haproxy/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }

$haproxy_installed = false;
if (!empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") $haproxy_installed = true;
if (!$haproxy_installed) { exec("which haproxy 2>/dev/null", $o, $r); if ($r === 0) $haproxy_installed = true; }
if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) $haproxy_installed = true;
if (!$haproxy_installed) { $_SESSION["error_msg"] = _("HAProxy is not installed"); header("Location: /list/server/"); exit(); }

$config_file = '/etc/haproxy/haproxy.cfg';
$v_config = file_exists($config_file) ? file_get_contents($config_file) : "";
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? 'running' : 'stopped';
$v_stats_enabled = $_SESSION['HAPROXY_STATS'] ?? 'no';
$v_stats_port = $_SESSION['HAPROXY_STATS_PORT'] ?? '8404';
$v_stats_user = $_SESSION['HAPROXY_STATS_USER'] ?? 'admin';

if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    if (!empty($_POST["v_config"])) {
        $temp_config = tempnam("/tmp", "haproxy_");
        file_put_contents($temp_config, $_POST["v_config"]);
        chmod($temp_config, 0644);
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        if ($return_var === 0) {
            $v_config = $_POST["v_config"];
            $_SESSION["ok_msg"] = _("HAProxy configuration saved and service restarted.");
        } else {
            $_SESSION["error_msg"] = _("Failed: ") . implode("<br>", $output);
        }
        unlink($temp_config);
    }
}
render_page($user, $TAB, "edit_haproxy");
unset($_SESSION["error_msg"]); unset($_SESSION["ok_msg"]);
PHPEOF
echo "    ✓ Done"

echo ""
echo "[5/9] Updating frontend/backend/listen edit controllers..."

cat > "$HESTIA/web/edit/haproxy/frontend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
$name = $_GET["name"] ?? "";
if (empty($name)) { header("Location: /list/haproxy/"); exit(); }
$config_file = "/etc/haproxy/haproxy.cfg";
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
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Frontend '%s' updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/"); exit();
            } else { $_SESSION["error_msg"] = _("Failed: ") . implode("<br>", $output); }
        } else { $_SESSION["error_msg"] = sprintf(_("Frontend '%s' not found."), htmlspecialchars($name)); }
    }
}
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^frontend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) $section_config = trim($matches[1]);
}
$v_name = $name; $v_config = $section_config;
render_page($user, $TAB, "edit_haproxy_section");
PHPEOF

cat > "$HESTIA/web/edit/haproxy/backend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
$name = $_GET["name"] ?? "";
if (empty($name)) { header("Location: /list/haproxy/"); exit(); }
$config_file = "/etc/haproxy/haproxy.cfg";
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
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Backend '%s' updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/"); exit();
            } else { $_SESSION["error_msg"] = _("Failed: ") . implode("<br>", $output); }
        } else { $_SESSION["error_msg"] = sprintf(_("Backend '%s' not found."), htmlspecialchars($name)); }
    }
}
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) $section_config = trim($matches[1]);
}
$v_name = $name; $v_config = $section_config; $v_section_type = "backend";
render_page($user, $TAB, "edit_haproxy_section");
PHPEOF

cat > "$HESTIA/web/edit/haproxy/listen/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
$name = $_GET["name"] ?? "";
if (empty($name)) { header("Location: /list/haproxy/"); exit(); }
$config_file = "/etc/haproxy/haproxy.cfg";
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
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Listen '%s' updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/"); exit();
            } else { $_SESSION["error_msg"] = _("Failed: ") . implode("<br>", $output); }
        } else { $_SESSION["error_msg"] = sprintf(_("Listen '%s' not found."), htmlspecialchars($name)); }
    }
}
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^listen\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) $section_config = trim($matches[1]);
}
$v_name = $name; $v_config = $section_config; $v_section_type = "listen";
render_page($user, $TAB, "edit_haproxy_section");
PHPEOF
echo "    ✓ Done"

echo ""
echo "[6/9] Updating add controllers..."

mkdir -p "$HESTIA/web/add/haproxy/frontend"
mkdir -p "$HESTIA/web/add/haproxy/backend"

cat > "$HESTIA/web/add/haproxy/frontend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }

if (!empty($_POST)) {
    verify_csrf($_POST);
    $name = trim($_POST['name'] ?? '');
    $bind = trim($_POST['bind'] ?? '');
    $mode = $_POST['mode'] ?? 'http';
    $default_backend = trim($_POST['default_backend'] ?? '');
    $options = $_POST['options'] ?? '';
    
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        $_SESSION['error_msg'] = _("Invalid frontend name.");
        header("Location: /add/haproxy/frontend/"); exit();
    }
    if (empty($bind)) {
        $_SESSION['error_msg'] = _("Bind address is required.");
        header("Location: /add/haproxy/frontend/"); exit();
    }
    
    $new_frontend = "\nfrontend {$name}\n    bind {$bind}\n    mode {$mode}\n";
    if (!empty($options)) {
        foreach (explode("\n", $options) as $line) {
            $line = trim($line);
            if (!empty($line)) $new_frontend .= "    {$line}\n";
        }
    }
    if (!empty($default_backend)) $new_frontend .= "    default_backend {$default_backend}\n";
    
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $new_config = file_get_contents($cfg_file) . $new_frontend;
        $temp_config = tempnam("/tmp", "haproxy_add_fe_");
        file_put_contents($temp_config, $new_config);
        chmod($temp_config, 0644);
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        unlink($temp_config);
        if ($return_var === 0) {
            $_SESSION['ok_msg'] = _("Frontend added successfully.");
        } else {
            $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output);
        }
    }
    header("Location: /list/haproxy/"); exit();
}
$v_name = ''; $v_bind = '*:80'; $v_mode = 'http'; $v_default_backend = ''; $v_options = '';
render_page($user, $TAB, "add_haproxy_frontend");
PHPEOF

cat > "$HESTIA/web/add/haproxy/backend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }

if (!empty($_POST)) {
    verify_csrf($_POST);
    $name = trim($_POST['name'] ?? '');
    $mode = $_POST['mode'] ?? 'http';
    $balance = $_POST['balance'] ?? 'roundrobin';
    $servers = $_POST['servers'] ?? '';
    $options = $_POST['options'] ?? '';
    
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        $_SESSION['error_msg'] = _("Invalid backend name.");
        header("Location: /add/haproxy/backend/"); exit();
    }
    if (empty($servers)) {
        $_SESSION['error_msg'] = _("At least one server is required.");
        header("Location: /add/haproxy/backend/"); exit();
    }
    
    $new_backend = "\nbackend {$name}\n    mode {$mode}\n    balance {$balance}\n";
    if (!empty($options)) {
        foreach (explode("\n", $options) as $line) {
            $line = trim($line);
            if (!empty($line)) $new_backend .= "    {$line}\n";
        }
    }
    foreach (explode("\n", $servers) as $line) {
        $line = trim($line);
        if (!empty($line)) {
            if (strpos($line, 'server ') !== 0) $line = "server {$line}";
            $new_backend .= "    {$line}\n";
        }
    }
    
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $new_config = file_get_contents($cfg_file) . $new_backend;
        $temp_config = tempnam("/tmp", "haproxy_add_be_");
        file_put_contents($temp_config, $new_config);
        chmod($temp_config, 0644);
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        unlink($temp_config);
        if ($return_var === 0) {
            $_SESSION['ok_msg'] = _("Backend added successfully.");
        } else {
            $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output);
        }
    }
    header("Location: /list/haproxy/"); exit();
}
$v_name = ''; $v_mode = 'http'; $v_balance = 'roundrobin'; $v_servers = ''; $v_options = '';
render_page($user, $TAB, "add_haproxy_backend");
PHPEOF
echo "    ✓ Done"

echo ""
echo "[7/9] Updating delete controllers..."

mkdir -p "$HESTIA/web/delete/haproxy/frontend"
mkdir -p "$HESTIA/web/delete/haproxy/backend"
mkdir -p "$HESTIA/web/delete/haproxy/listen"

cat > "$HESTIA/web/delete/haproxy/frontend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) { header("Location: /list/haproxy/"); exit(); }
$name = $_GET['name'] ?? '';
if (!empty($name) && preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $config = file_get_contents($cfg_file);
        $pattern = '/\nfrontend\s+' . preg_quote($name, '/') . '\s*\n([ \t]+[^\n]+\n)*/';
        $new_config = preg_replace($pattern, "\n", $config);
        if ($new_config !== $config) {
            $temp_config = tempnam("/tmp", "haproxy_del_fe_");
            file_put_contents($temp_config, $new_config);
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) { $_SESSION['ok_msg'] = _("Frontend deleted."); }
            else { $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output); }
        }
    }
}
header("Location: /list/haproxy/"); exit();
PHPEOF

cat > "$HESTIA/web/delete/haproxy/backend/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) { header("Location: /list/haproxy/"); exit(); }
$name = $_GET['name'] ?? '';
if (!empty($name) && preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $config = file_get_contents($cfg_file);
        $pattern = '/\nbackend\s+' . preg_quote($name, '/') . '\s*\n([ \t]+[^\n]+\n)*/';
        $new_config = preg_replace($pattern, "\n", $config);
        if ($new_config !== $config) {
            $temp_config = tempnam("/tmp", "haproxy_del_be_");
            file_put_contents($temp_config, $new_config);
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) { $_SESSION['ok_msg'] = _("Backend deleted."); }
            else { $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output); }
        }
    }
}
header("Location: /list/haproxy/"); exit();
PHPEOF

cat > "$HESTIA/web/delete/haproxy/listen/index.php" << 'PHPEOF'
<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) { header("Location: /list/haproxy/"); exit(); }
$name = $_GET['name'] ?? '';
if (!empty($name) && preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $config = file_get_contents($cfg_file);
        $pattern = '/\nlisten\s+' . preg_quote($name, '/') . '\s*\n([ \t]+[^\n]+\n)*/';
        $new_config = preg_replace($pattern, "\n", $config);
        if ($new_config !== $config) {
            $temp_config = tempnam("/tmp", "haproxy_del_ls_");
            file_put_contents($temp_config, $new_config);
            chmod($temp_config, 0644);
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            if ($return_var === 0) { $_SESSION['ok_msg'] = _("Listen deleted."); }
            else { $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output); }
        }
    }
}
header("Location: /list/haproxy/"); exit();
PHPEOF
echo "    ✓ Done"

echo ""
echo "[8/9] Updating hestia.conf..."
config_file="$HESTIA/conf/hestia.conf"
systemctl is-active --quiet haproxy 2>/dev/null && grep -q "HAPROXY_SYSTEM" "$config_file" || echo "HAPROXY_SYSTEM='yes'" >> "$config_file"
systemctl is-active --quiet rabbitmq-server 2>/dev/null && grep -q "RABBITMQ_SYSTEM" "$config_file" || echo "RABBITMQ_SYSTEM='yes'" >> "$config_file"
systemctl is-active --quiet kafka 2>/dev/null && grep -q "KAFKA_SYSTEM" "$config_file" || echo "KAFKA_SYSTEM='yes'" >> "$config_file"
systemctl is-active --quiet redis-server 2>/dev/null && grep -q "REDIS_SYSTEM" "$config_file" || echo "REDIS_SYSTEM='yes'" >> "$config_file"
systemctl is-active --quiet mongod 2>/dev/null && grep -q "MONGODB_SYSTEM" "$config_file" || echo "MONGODB_SYSTEM='yes'" >> "$config_file"
echo "    ✓ Done"

echo ""
echo "[9/9] Restarting services..."
systemctl restart hestia 2>/dev/null
echo "    ✓ Done"

echo ""
echo "=============================================="
echo "✅ Complete fix applied!"
echo ""
echo "Please logout and login to admin panel."
echo "=============================================="
