<?php
/**
 * VHestiaCP - Rclone Backup API
 *
 * Handles rclone backup operations: run, status, list remotes
 */

header("Content-Type: application/json");

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check login
if (empty($_SESSION["user"])) {
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

$user = $_SESSION["user"];
$action = $_GET["action"] ?? "status";

// Config paths
$user_home = "/home/$user";
$rclone_config = "$user_home/.config/rclone/rclone.conf";
$backup_config = "$user_home/.config/vhestia/rclone-backup.json";

switch ($action) {
    case "list_remotes":
        // List all configured remotes for this user
        $remotes = [];

        if (file_exists($rclone_config)) {
            exec("sudo -u " . escapeshellarg($user) . " rclone listremotes --config=" . escapeshellarg($rclone_config) . " 2>/dev/null", $output);
            foreach ($output as $line) {
                $remote_name = rtrim($line, ":");
                if (!empty($remote_name)) {
                    // Get remote type
                    exec("sudo -u " . escapeshellarg($user) . " rclone config show " . escapeshellarg($remote_name) . " --config=" . escapeshellarg($rclone_config) . " 2>/dev/null", $config_output);
                    $type = 'unknown';
                    foreach ($config_output as $cfg_line) {
                        if (preg_match('/^type\s*=\s*(.+)$/', $cfg_line, $m)) {
                            $type = trim($m[1]);
                            break;
                        }
                    }

                    // Test connection
                    exec("sudo -u " . escapeshellarg($user) . " rclone lsd " . escapeshellarg($remote_name . ":") . " --max-depth 0 --config=" . escapeshellarg($rclone_config) . " 2>&1", $test_output, $test_return);
                    $connected = ($test_return === 0);

                    $remotes[$remote_name] = [
                        "TYPE" => $type,
                        "CONNECTED" => $connected
                    ];
                }
            }
        }

        // Load backup config to get folders and schedule
        if (file_exists($backup_config)) {
            $backup_data = json_decode(file_get_contents($backup_config), true);
            if ($backup_data) {
                foreach ($remotes as $name => &$remote) {
                    if (isset($backup_data[$name])) {
                        $remote["FOLDERS"] = $backup_data[$name]["folders"] ?? [];
                        $remote["SCHEDULE"] = $backup_data[$name]["schedule"] ?? "manual";
                    }
                }
            }
        }

        echo json_encode(["remotes" => $remotes]);
        break;

    case "run":
        // Run backup for a specific remote
        $remote = $_GET["remote"] ?? "";
        if (empty($remote)) {
            http_response_code(400);
            echo json_encode(["error" => "Remote name required"]);
            exit();
        }

        // Load backup config
        if (!file_exists($backup_config)) {
            http_response_code(404);
            echo json_encode(["error" => "No backup configuration found"]);
            exit();
        }

        $backup_data = json_decode(file_get_contents($backup_config), true);
        if (!isset($backup_data[$remote])) {
            http_response_code(404);
            echo json_encode(["error" => "Remote not configured for backup"]);
            exit();
        }

        $config = $backup_data[$remote];
        $folders = $config["folders"] ?? [];
        $delete_extra = $config["delete_extra"] ?? false;
        $bandwidth = $config["bandwidth"] ?? 0;

        if (empty($folders)) {
            http_response_code(400);
            echo json_encode(["error" => "No folders configured for backup"]);
            exit();
        }

        // Build rclone command
        $log_file = "/tmp/rclone-backup-$user-$remote-" . time() . ".log";
        $errors = [];
        $success_count = 0;

        foreach ($folders as $folder) {
            $local = $folder["local"] ?? "";
            $remote_path = $folder["remote"] ?? "";

            if (empty($local) || empty($remote_path)) continue;

            // Build command
            $cmd = "sudo -u " . escapeshellarg($user) . " rclone sync";
            $cmd .= " " . escapeshellarg($local);
            $cmd .= " " . escapeshellarg($remote . ":" . $remote_path);
            $cmd .= " --config=" . escapeshellarg($rclone_config);

            if ($delete_extra) {
                $cmd .= " --delete-during";
            }

            if ($bandwidth > 0) {
                $cmd .= " --bwlimit=" . escapeshellarg($bandwidth . "M");
            }

            $cmd .= " >> " . escapeshellarg($log_file) . " 2>&1 &";

            // Run in background
            exec($cmd, $output, $return_code);
            $success_count++;
        }

        echo json_encode([
            "success" => true,
            "message" => "Backup started for $success_count folder(s)",
            "log_file" => $log_file
        ]);
        break;

    case "save_config":
        // Save backup configuration
        $input = json_decode(file_get_contents("php://input"), true);

        if (empty($input["remote"])) {
            http_response_code(400);
            echo json_encode(["error" => "Remote name required"]);
            exit();
        }

        // Ensure config directory exists
        $config_dir = dirname($backup_config);
        if (!is_dir($config_dir)) {
            exec("sudo -u " . escapeshellarg($user) . " mkdir -p " . escapeshellarg($config_dir));
        }

        // Load existing config
        $backup_data = [];
        if (file_exists($backup_config)) {
            $backup_data = json_decode(file_get_contents($backup_config), true) ?? [];
        }

        // Update config for this remote
        $backup_data[$input["remote"]] = [
            "folders" => $input["folders"] ?? [],
            "schedule" => $input["schedule"] ?? "manual",
            "schedule_time" => $input["schedule_time"] ?? "02:00",
            "schedule_weekday" => $input["schedule_weekday"] ?? 0,
            "schedule_interval" => $input["schedule_interval"] ?? 60,
            "delete_extra" => $input["delete_extra"] ?? false,
            "bandwidth" => $input["bandwidth"] ?? 0
        ];

        // Save config
        $tmp_file = tempnam("/tmp", "rclone_config_");
        file_put_contents($tmp_file, json_encode($backup_data, JSON_PRETTY_PRINT));
        exec("sudo mv " . escapeshellarg($tmp_file) . " " . escapeshellarg($backup_config));
        exec("sudo chown " . escapeshellarg($user) . ":" . escapeshellarg($user) . " " . escapeshellarg($backup_config));

        // Update cron if scheduled
        updateRcloneCron($user, $input["remote"], $backup_data[$input["remote"]]);

        echo json_encode(["success" => true, "message" => "Configuration saved"]);
        break;

    case "delete_remote":
        // Delete a remote configuration
        $remote = $_GET["remote"] ?? "";
        if (empty($remote)) {
            http_response_code(400);
            echo json_encode(["error" => "Remote name required"]);
            exit();
        }

        // Delete from rclone config
        exec("sudo -u " . escapeshellarg($user) . " rclone config delete " . escapeshellarg($remote) . " --config=" . escapeshellarg($rclone_config) . " 2>&1", $output, $return);

        // Remove from backup config
        if (file_exists($backup_config)) {
            $backup_data = json_decode(file_get_contents($backup_config), true) ?? [];
            if (isset($backup_data[$remote])) {
                unset($backup_data[$remote]);
                $tmp_file = tempnam("/tmp", "rclone_config_");
                file_put_contents($tmp_file, json_encode($backup_data, JSON_PRETTY_PRINT));
                exec("sudo mv " . escapeshellarg($tmp_file) . " " . escapeshellarg($backup_config));
            }
        }

        // Remove cron
        removeRcloneCron($user, $remote);

        echo json_encode(["success" => ($return === 0), "message" => ($return === 0) ? "Remote deleted" : "Failed to delete remote"]);
        break;

    case "logs":
        // Get recent backup logs
        $remote = $_GET["remote"] ?? "";
        $logs = [];

        $log_pattern = "/tmp/rclone-backup-$user-" . ($remote ? "$remote-" : "") . "*.log";
        exec("ls -t $log_pattern 2>/dev/null | head -10", $log_files);

        foreach ($log_files as $log_file) {
            $logs[] = [
                "file" => basename($log_file),
                "time" => filemtime($log_file),
                "size" => filesize($log_file)
            ];
        }

        echo json_encode(["logs" => $logs]);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
}

/**
 * Update cron job for rclone backup
 */
function updateRcloneCron($user, $remote, $config) {
    $schedule = $config["schedule"] ?? "manual";
    if ($schedule === "manual") {
        removeRcloneCron($user, $remote);
        return;
    }

    $time = $config["schedule_time"] ?? "02:00";
    $weekday = $config["schedule_weekday"] ?? 0;
    $interval = $config["schedule_interval"] ?? 60;

    // Parse time
    $parts = explode(":", $time);
    $hour = intval($parts[0] ?? 2);
    $minute = intval($parts[1] ?? 0);

    // Build cron expression
    switch ($schedule) {
        case "hourly":
            $cron = "0 * * * *";
            break;
        case "daily":
            $cron = "$minute $hour * * *";
            break;
        case "weekly":
            $cron = "$minute $hour * * $weekday";
            break;
        case "custom":
            $unit = $config["schedule_unit"] ?? "minutes";
            if ($unit === "hours") {
                $cron = "0 */$interval * * *";
            } else {
                $cron = "*/$interval * * * *";
            }
            break;
        default:
            return;
    }

    // Add cron job
    $cron_cmd = "/usr/local/hestia/bin/v-run-rclone-backup $user $remote";
    $cron_line = "$cron $cron_cmd # VHESTIA_RCLONE_$remote";

    // Remove old cron for this remote and add new one
    removeRcloneCron($user, $remote);
    exec("(crontab -u " . escapeshellarg($user) . " -l 2>/dev/null; echo " . escapeshellarg($cron_line) . ") | crontab -u " . escapeshellarg($user) . " -");
}

/**
 * Remove cron job for rclone backup
 */
function removeRcloneCron($user, $remote) {
    exec("crontab -u " . escapeshellarg($user) . " -l 2>/dev/null | grep -v 'VHESTIA_RCLONE_$remote' | crontab -u " . escapeshellarg($user) . " -");
}
