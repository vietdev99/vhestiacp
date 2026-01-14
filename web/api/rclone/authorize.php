<?php
/**
 * VHestiaCP - Rclone Google Drive Authorization API
 *
 * Since Google deprecated OOB flow, users need to run "rclone authorize drive"
 * on a machine with a browser and paste the token here.
 */

use function Hestiacp\quoteshellarg\quoteshellarg;

header("Content-Type: application/json");

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check admin
if ($_SESSION["userContext"] != "admin") {
    http_response_code(403);
    echo json_encode(["error" => "Access denied"]);
    exit();
}

// CSRF check
if (empty($_GET["token"]) || $_GET["token"] !== $_SESSION["token"]) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid token"]);
    exit();
}

$action = $_GET["action"] ?? "status";

switch ($action) {
    case "save_token":
        // Get token from POST
        $token = $_POST["token"] ?? "";
        if (empty($token)) {
            http_response_code(400);
            echo json_encode(["error" => "Token is required"]);
            exit();
        }

        // Validate token JSON format
        $token_data = json_decode($token, true);
        if (!$token_data || empty($token_data["access_token"])) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid token format. Make sure to paste the complete JSON token."]);
            exit();
        }

        // Create rclone config
        $config_dir = "/root/.config/rclone";
        $config_file = "$config_dir/rclone.conf";

        // Ensure config directory exists
        if (!is_dir($config_dir)) {
            mkdir($config_dir, 0700, true);
        }

        // Read existing config or create new
        $config = [];
        if (file_exists($config_file)) {
            $config = parse_ini_file($config_file, true, INI_SCANNER_RAW);
            if ($config === false) $config = [];
        }

        // Add/update gdrive remote
        $config["gdrive"] = [
            "type" => "drive",
            "scope" => "drive",
            "token" => $token,
            "team_drive" => ""
        ];

        // Write config file
        $config_content = "";
        foreach ($config as $section => $values) {
            $config_content .= "[$section]\n";
            foreach ($values as $key => $value) {
                $config_content .= "$key = $value\n";
            }
            $config_content .= "\n";
        }

        file_put_contents($config_file, $config_content);
        chmod($config_file, 0600);

        // Test connection
        exec("rclone lsd gdrive: --max-depth 0 2>&1", $test_output, $test_return);
        $connection_ok = ($test_return === 0);

        // Create backup folder and configure HestiaCP
        if ($connection_ok) {
            exec("rclone mkdir gdrive:hestia-backups 2>&1");
            exec(HESTIA_CMD . "v-add-backup-host rclone gdrive /hestia-backups 2>&1", $backup_output, $backup_return);
        }

        echo json_encode([
            "success" => true,
            "connected" => $connection_ok,
            "message" => $connection_ok
                ? "Google Drive connected successfully!"
                : "Token saved but connection test failed. Please check if the token is valid."
        ]);
        break;

    case "status":
        // Check if rclone gdrive is configured
        $output = [];
        exec("rclone listremotes 2>/dev/null", $output);
        $remotes = array_map(function($r) { return rtrim($r, ":"); }, $output);

        $gdrive_configured = in_array("gdrive", $remotes);

        // Test connection if configured
        $connected = false;
        if ($gdrive_configured) {
            exec("rclone lsd gdrive: --max-depth 0 2>&1", $test_output, $return_code);
            $connected = ($return_code === 0);
        }

        echo json_encode([
            "configured" => $gdrive_configured,
            "connected" => $connected,
            "remotes" => $remotes
        ]);
        break;

    case "disconnect":
        // Remove gdrive remote
        exec("rclone config delete gdrive 2>&1", $output, $return_code);

        // Also remove from HestiaCP backup if it was the backup host
        exec(HESTIA_CMD . "v-list-backup-host rclone json 2>/dev/null", $backup_output);
        $backup_config = json_decode(implode("", $backup_output), true);
        if (!empty($backup_config["rclone"]["HOST"]) && $backup_config["rclone"]["HOST"] === "gdrive") {
            exec(HESTIA_CMD . "v-delete-backup-host rclone", $del_output);
        }

        echo json_encode([
            "success" => ($return_code === 0),
            "message" => ($return_code === 0) ? "Google Drive disconnected" : "Failed to disconnect"
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
}
