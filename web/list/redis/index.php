<?php
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
$redis_data = [];

// Check configuration
if (!empty($_SESSION["REDIS_SYSTEM"]) && $_SESSION["REDIS_SYSTEM"] === "yes") {
    $redis_installed = true;
}

// Also check for config file
if (file_exists("/usr/local/hestia/conf/redis.conf")) {
    $redis_installed = true;
    
    // Read credentials from config
    $config = file_get_contents("/usr/local/hestia/conf/redis.conf");
    
    if (preg_match("/REDIS_HOST='([^']+)'/", $config, $m)) {
        $redis_data['host'] = $m[1];
    }
    if (preg_match("/REDIS_PORT='([^']+)'/", $config, $m)) {
        $redis_data['port'] = $m[1];
    }
    if (preg_match("/REDIS_PASSWORD='([^']+)'/", $config, $m)) {
        $redis_data['password'] = $m[1];
    }
}

// Check service status
if ($redis_installed) {
    exec("systemctl is-active redis-server 2>/dev/null", $status_output, $status_return);
    $redis_data['status'] = ($status_return === 0) ? 'running' : 'stopped';
    
    // Get version
    exec("redis-server --version 2>/dev/null | head -1", $version_output);
    if (!empty($version_output[0])) {
        preg_match('/v=([0-9.]+)/', $version_output[0], $matches);
        $redis_data['version'] = $matches[1] ?? 'Unknown';
    }
    
    // Get Redis info
    $password = $redis_data['password'] ?? '';
    exec("redis-cli -a '$password' INFO 2>/dev/null | head -50", $info_output);
    foreach ($info_output as $line) {
        if (strpos($line, 'used_memory_human:') === 0) {
            $redis_data['memory'] = trim(str_replace('used_memory_human:', '', $line));
        }
        if (strpos($line, 'connected_clients:') === 0) {
            $redis_data['clients'] = trim(str_replace('connected_clients:', '', $line));
        }
        if (strpos($line, 'uptime_in_seconds:') === 0) {
            $redis_data['uptime'] = trim(str_replace('uptime_in_seconds:', '', $line));
        }
    }
}

// Render page
render_page($user, $TAB, "list_redis");

$_SESSION["back"] = $_SERVER["REQUEST_URI"];
