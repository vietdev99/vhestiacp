<?php
/**
 * VHestiaCP - List Rclone Remotes
 */

$TAB = "BACKUP";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check login
if (empty($_SESSION["user"])) {
	header("Location: /login/");
	exit();
}

// Config paths
$user_home = "/home/$user";
$rclone_config = "$user_home/.config/rclone/rclone.conf";
$backup_config = "$user_home/.config/vhestia/rclone-backup.json";

// Get remotes list
$data = [];

// Check if rclone config exists
exec("sudo -u " . escapeshellarg($user) . " test -f " . escapeshellarg($rclone_config) . " && echo 'exists'", $config_exists);

if (!empty($config_exists)) {
	// Get remotes from rclone
	exec("sudo -u " . escapeshellarg($user) . " rclone listremotes --config=" . escapeshellarg($rclone_config) . " 2>/dev/null", $remotes_output);

	foreach ($remotes_output as $line) {
		$remote_name = rtrim($line, ":");
		if (!empty($remote_name)) {
			// Get remote type
			$config_output = [];
			exec("sudo -u " . escapeshellarg($user) . " rclone config show " . escapeshellarg($remote_name) . " --config=" . escapeshellarg($rclone_config) . " 2>/dev/null", $config_output);
			$type = 'unknown';
			foreach ($config_output as $cfg_line) {
				if (preg_match('/^type\s*=\s*(.+)$/', $cfg_line, $m)) {
					$type = trim($m[1]);
					break;
				}
			}

			// Test connection (quick check)
			$test_output = [];
			exec("sudo -u " . escapeshellarg($user) . " timeout 5 rclone lsd " . escapeshellarg($remote_name . ":") . " --max-depth 0 --config=" . escapeshellarg($rclone_config) . " 2>&1", $test_output, $test_return);
			$connected = ($test_return === 0);

			$data[$remote_name] = [
				"TYPE" => $type,
				"CONNECTED" => $connected,
				"FOLDERS" => [],
				"SCHEDULE" => "manual"
			];
		}
	}

	// Load backup config to get folders and schedule
	if (file_exists($backup_config)) {
		$backup_data = json_decode(file_get_contents($backup_config), true);
		if ($backup_data) {
			foreach ($data as $name => &$remote) {
				if (isset($backup_data[$name])) {
					$remote["FOLDERS"] = $backup_data[$name]["folders"] ?? [];
					$remote["SCHEDULE"] = $backup_data[$name]["schedule"] ?? "manual";
				}
			}
		}
	}
}

// Render page
render_page($user, $TAB, "list_rclone");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
