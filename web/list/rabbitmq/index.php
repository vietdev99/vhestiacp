<?php
$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Check if RabbitMQ is installed
$rabbitmq_installed = false;
$rabbitmq_data = [];

// Check configuration
if (!empty($_SESSION["RABBITMQ_SYSTEM"]) && $_SESSION["RABBITMQ_SYSTEM"] === "yes") {
    $rabbitmq_installed = true;
}

// Also check for config file
if (file_exists("/usr/local/hestia/conf/rabbitmq.conf")) {
    $rabbitmq_installed = true;
    
    // Read credentials from config
    $config = file_get_contents("/usr/local/hestia/conf/rabbitmq.conf");
    
    if (preg_match("/RABBITMQ_USER='([^']+)'/", $config, $m)) {
        $rabbitmq_data['user'] = $m[1];
    }
    if (preg_match("/RABBITMQ_PASSWORD='([^']+)'/", $config, $m)) {
        $rabbitmq_data['password'] = $m[1];
    }
    if (preg_match("/RABBITMQ_HOST='([^']+)'/", $config, $m)) {
        $rabbitmq_data['host'] = $m[1];
    }
    if (preg_match("/RABBITMQ_PORT='([^']+)'/", $config, $m)) {
        $rabbitmq_data['port'] = $m[1];
    }
    if (preg_match("/RABBITMQ_MANAGEMENT_PORT='([^']+)'/", $config, $m)) {
        $rabbitmq_data['management_port'] = $m[1];
    }
    if (preg_match("/RABBITMQ_MANAGEMENT='([^']+)'/", $config, $m)) {
        $rabbitmq_data['management'] = $m[1];
    }
}

// Check service status
if ($rabbitmq_installed) {
    exec("systemctl is-active rabbitmq-server 2>/dev/null", $status_output, $status_return);
    $rabbitmq_data['status'] = ($status_return === 0) ? 'running' : 'stopped';
    
    // Get version
    exec("rabbitmqctl version 2>/dev/null | head -1", $version_output);
    $rabbitmq_data['version'] = $version_output[0] ?? 'Unknown';
}

// Render page
render_page($user, $TAB, "list_rabbitmq");

$_SESSION["back"] = $_SERVER["REQUEST_URI"];
