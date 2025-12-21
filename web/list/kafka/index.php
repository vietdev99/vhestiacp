<?php
$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Check if Kafka is installed
$kafka_installed = false;
$kafka_data = [];

// Check configuration
if (!empty($_SESSION["KAFKA_SYSTEM"]) && $_SESSION["KAFKA_SYSTEM"] === "yes") {
    $kafka_installed = true;
}

// Also check for config file
if (file_exists("/usr/local/hestia/conf/kafka.conf")) {
    $kafka_installed = true;
    
    // Read credentials from config
    $config = file_get_contents("/usr/local/hestia/conf/kafka.conf");
    
    if (preg_match("/KAFKA_HOST='([^']+)'/", $config, $m)) {
        $kafka_data['host'] = $m[1];
    }
    if (preg_match("/KAFKA_PORT='([^']+)'/", $config, $m)) {
        $kafka_data['port'] = $m[1];
    }
    if (preg_match("/KAFKA_USER='([^']+)'/", $config, $m)) {
        $kafka_data['user'] = $m[1];
    }
    if (preg_match("/KAFKA_PASSWORD='([^']+)'/", $config, $m)) {
        $kafka_data['password'] = $m[1];
    }
    if (preg_match("/KAFKA_UI='([^']+)'/", $config, $m)) {
        $kafka_data['ui'] = $m[1];
    }
    if (preg_match("/KAFKA_UI_PORT='([^']+)'/", $config, $m)) {
        $kafka_data['ui_port'] = $m[1];
    }
    if (preg_match("/KAFKA_VERSION='([^']+)'/", $config, $m)) {
        $kafka_data['version'] = $m[1];
    }
    if (preg_match("/CLUSTER_ID='([^']+)'/", $config, $m)) {
        $kafka_data['cluster_id'] = $m[1];
    }
}

// Check service status
if ($kafka_installed) {
    exec("systemctl is-active kafka 2>/dev/null", $status_output, $status_return);
    $kafka_data['status'] = ($status_return === 0) ? 'running' : 'stopped';
    
    // Check Kafka UI status
    if (!empty($kafka_data['ui']) && $kafka_data['ui'] === 'yes') {
        exec("systemctl is-active kafka-ui 2>/dev/null", $ui_status_output, $ui_status_return);
        $kafka_data['ui_status'] = ($ui_status_return === 0) ? 'running' : 'stopped';
    }
}

// Render page
render_page($user, $TAB, "list_kafka");

$_SESSION["back"] = $_SERVER["REQUEST_URI"];
