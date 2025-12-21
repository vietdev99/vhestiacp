<?php
error_reporting(NULL);
ob_start();
$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Check if Redis is installed
$redis_installed = false;
if (!empty($_SESSION["REDIS_SYSTEM"]) && $_SESSION["REDIS_SYSTEM"] === "yes") {
    $redis_installed = true;
}

if (!$redis_installed && !file_exists("/etc/redis/redis.conf")) {
    $_SESSION["error_msg"] = _("Redis is not installed on this server.");
    header("Location: /list/server/");
    exit();
}

// Config file path
$config_file = "/etc/redis/redis.conf";

// Check token on POST
if (!empty($_POST)) {
    verify_csrf($_POST);
    
    if (!empty($_POST["v_config"])) {
        // Create temp file for validation
        $temp_config = tempnam("/tmp", "redis_");
        file_put_contents($temp_config, $_POST["v_config"]);
        
        // Backup and save
        copy($config_file, $config_file . ".bak");
        file_put_contents($config_file, $_POST["v_config"]);
        $v_config = $_POST["v_config"];
        
        // Restart Redis using Hestia command
        exec(HESTIA_CMD . "v-restart-service redis-server 2>&1", $restart_output, $restart_result);
        
        if ($restart_result === 0) {
            $_SESSION["ok_msg"] = _("Redis configuration has been saved and service restarted.");
        } else {
            // Restore backup on failure
            copy($config_file . ".bak", $config_file);
            exec(HESTIA_CMD . "v-restart-service redis-server 2>&1");
            $_SESSION["error_msg"] = _("Configuration saved but Redis failed to restart. Restored previous config. Error: ") . implode("\n", $restart_output);
        }
        
        unlink($temp_config);
        unset($restart_output);
    }
}

// Read current config
$v_config = "";
if (file_exists($config_file)) {
    $v_config = file_get_contents($config_file);
}

// Check service status
exec("systemctl is-active redis-server 2>/dev/null", $status_output, $status_return);
$redis_status = ($status_return === 0) ? 'running' : 'stopped';

// Render page
render_page($user, $TAB, "edit_server_redis");

$_SESSION["back"] = $_SERVER["REQUEST_URI"];
