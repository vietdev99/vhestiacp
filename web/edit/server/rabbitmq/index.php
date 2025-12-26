<?php

$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user
if ($_SESSION["userContext"] != "admin") {
    header("Location: /list/user");
    exit();
}

// Check POST request for config save
if (!empty($_POST["save"])) {
    verify_csrf($_POST);

    $v_restart = "yes";
    if (empty($_POST["v_restart"])) {
        $v_restart = "no";
    }

    // Update config
    if (!empty($_POST["v_config"])) {
        exec("mktemp", $mktemp_output, $return_var);
        $new_conf = $mktemp_output[0];
        $fp = fopen($new_conf, "w");
        fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
        fclose($fp);
        exec(
            HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " rabbitmq-server " . $v_restart,
            $output,
            $return_var,
        );
        check_return_code($return_var, $output);
        unset($output);
        unlink($new_conf);
    }

    if (empty($_SESSION["error_msg"])) {
        $_SESSION["ok_msg"] = _("Changes have been saved.");
    }
}

// Service info
$v_config_path = "/etc/rabbitmq/rabbitmq.conf";
$v_service_name = "RABBITMQ";

// Get status
exec("systemctl is-active rabbitmq-server 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? "running" : "stopped";

// Get version
$v_version = "Unknown";
exec("rabbitmqctl version 2>&1", $version_output, $version_return);
if (!empty($version_output[0])) {
    $v_version = trim($version_output[0]);
}

// Read config
$v_config = "";
if (file_exists($v_config_path)) {
    $v_config = file_get_contents($v_config_path);
}

// Get RabbitMQ credentials
$rabbitmq_host = "localhost";
$rabbitmq_port = "5672";
$rabbitmq_mgmt_port = "15672";
$rabbitmq_user = "admin";
$rabbitmq_pass = "";
$rabbitmq_mgmt_url = "http://" . $_SERVER["SERVER_ADDR"] . ":15672";

// Try to read credentials from VHestiaCP config
$vhestia_conf = "/usr/local/hestia/conf/rabbitmq.conf";
if (file_exists($vhestia_conf)) {
    $lines = file($vhestia_conf, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
    foreach ($lines as $line) {
        if (strpos($line, '=') !== false) {
            list($key, $value) = explode('=', $line, 2);
            $key = trim($key);
            $value = trim($value, " \t\n\r\0\x0B'\"");
            switch ($key) {
                case 'RABBITMQ_USER': $rabbitmq_user = $value; break;
                case 'RABBITMQ_PASSWORD': $rabbitmq_pass = $value; break;
                case 'RABBITMQ_HOST': $rabbitmq_host = $value; break;
                case 'RABBITMQ_PORT': $rabbitmq_port = $value; break;
            }
        }
    }
}

// Back button title
$back = _("SERVER");

// Render page
render_page($user, $TAB, "edit_server_rabbitmq");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
