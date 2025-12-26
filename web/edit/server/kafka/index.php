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
            HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " kafka " . $v_restart,
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
$v_config_path = "/opt/kafka/config/server.properties";
$v_service_name = "KAFKA";

// Get status
exec("systemctl is-active kafka 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? "running" : "stopped";

// Get version - try to read from kafka-server-start.sh or properties
$v_version = "Unknown";
exec("cat /opt/kafka/gradle.properties 2>/dev/null | grep version | head -1", $version_output);
if (!empty($version_output[0])) {
    $v_version = trim(str_replace("version=", "", $version_output[0]));
}

// Read config
$v_config = "";
if (file_exists($v_config_path)) {
    $v_config = file_get_contents($v_config_path);
}

// Get Kafka connection info
$kafka_bootstrap = "localhost:9092";
$kafka_ui_url = "http://" . $_SERVER["SERVER_ADDR"] . ":8080";
$zookeeper_connect = "localhost:2181";

// Read from server.properties
if (file_exists($v_config_path)) {
    $props = file_get_contents($v_config_path);
    if (preg_match('/listeners=PLAINTEXT:\/\/([^:]+):(\d+)/', $props, $m)) {
        $kafka_bootstrap = $m[1] . ":" . $m[2];
    } elseif (preg_match('/listeners=([^:]+):(\d+)/', $props, $m)) {
        $kafka_bootstrap = "localhost:" . $m[2];
    }
    if (preg_match('/zookeeper\.connect=([^\s\n]+)/', $props, $m)) {
        $zookeeper_connect = trim($m[1]);
    }
}

// Check for Kafka UI
$kafka_ui_config = "/opt/kafka-ui/application.yml";
if (file_exists($kafka_ui_config)) {
    $kafka_ui_url = "http://" . $_SERVER["SERVER_ADDR"] . ":8080";
}

// Back button title
$back = _("SERVER");

// Render page
render_page($user, $TAB, "edit_server_kafka");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
