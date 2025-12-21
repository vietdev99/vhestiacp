<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

ob_start();
$TAB = "SERVER";

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
    exec("which haproxy 2>/dev/null", $o, $r);
    if ($r === 0) $haproxy_installed = true;
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

if (file_exists($config_file)) {
    $v_config = file_get_contents($config_file);
}

// Get status
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? 'running' : 'stopped';

// Handle POST
if (!empty($_POST["save"])) {
    verify_csrf($_POST);
    
    if (!empty($_POST["v_config"])) {
        $temp_config = tempnam("/tmp", "haproxy_srv_");
        file_put_contents($temp_config, $_POST["v_config"]);
        chmod($temp_config, 0644);
        
        // Use hestia script to save and restart
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

unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
