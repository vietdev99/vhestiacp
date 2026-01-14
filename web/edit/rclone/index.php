<?php
/**
 * VHestiaCP - Edit Rclone Remote
 */

ob_start();
$TAB = "BACKUP";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check login
if (empty($_SESSION["user"])) {
	header("Location: /login/");
	exit();
}

// Check token
verify_csrf($_GET);

// Get remote name
$v_name = $_GET["remote"] ?? "";
if (empty($v_name)) {
	header("Location: /list/rclone/");
	exit();
}

// Config paths
$user_home = "/home/$user";
$rclone_config = "$user_home/.config/rclone/rclone.conf";
$backup_config = "$user_home/.config/vhestia/rclone-backup.json";

// Get remote info from rclone
$remote_data = [];
exec("sudo -u " . escapeshellarg($user) . " rclone config show " . escapeshellarg($v_name) . " --config=" . escapeshellarg($rclone_config) . " 2>/dev/null", $config_output, $config_return);

if ($config_return !== 0 || empty($config_output)) {
	$_SESSION["error_msg"] = _("Remote not found.");
	header("Location: /list/rclone/");
	exit();
}

// Parse config
$v_provider = "unknown";
foreach ($config_output as $line) {
	if (preg_match('/^type\s*=\s*(.+)$/', $line, $m)) {
		$v_provider = trim($m[1]);
	}
}

// Load backup config
$backup_data = [];
if (file_exists($backup_config)) {
	$backup_data = json_decode(file_get_contents($backup_config), true) ?? [];
}

$remote_config = $backup_data[$v_name] ?? [];
$v_folders = $remote_config["folders"] ?? [["local" => "", "remote" => ""]];
$v_schedule_type = $remote_config["schedule"] ?? "manual";
$v_schedule_time = $remote_config["schedule_time"] ?? "02:00";
$v_schedule_weekday = $remote_config["schedule_weekday"] ?? 0;
$v_schedule_interval = $remote_config["schedule_interval"] ?? 60;
$v_schedule_unit = $remote_config["schedule_unit"] ?? "minutes";
$v_delete_extra = $remote_config["delete_extra"] ?? false;
$v_bandwidth = $remote_config["bandwidth"] ?? 0;

// Check POST request
if (!empty($_POST["save"])) {
	// Check token
	verify_csrf($_POST);

	// Get form data
	$v_folders = $_POST["v_folders"] ?? [];
	$v_schedule_type = $_POST["v_schedule_type"] ?? "manual";
	$v_schedule_time = $_POST["v_schedule_time"] ?? "02:00";
	$v_schedule_weekday = $_POST["v_schedule_weekday"] ?? 0;
	$v_schedule_interval = $_POST["v_schedule_interval"] ?? 60;
	$v_schedule_unit = $_POST["v_schedule_unit"] ?? "minutes";
	$v_delete_extra = isset($_POST["v_delete_extra"]) ? true : false;
	$v_bandwidth = intval($_POST["v_bandwidth"] ?? 0);

	// Filter valid folders
	$valid_folders = [];
	foreach ($v_folders as $folder) {
		if (!empty($folder["local"]) && !empty($folder["remote"])) {
			$valid_folders[] = [
				"local" => $folder["local"],
				"remote" => $folder["remote"]
			];
		}
	}

	// Update backup config
	$backup_data[$v_name] = [
		"folders" => $valid_folders,
		"schedule" => $v_schedule_type,
		"schedule_time" => $v_schedule_time,
		"schedule_weekday" => intval($v_schedule_weekday),
		"schedule_interval" => intval($v_schedule_interval),
		"schedule_unit" => $v_schedule_unit,
		"delete_extra" => $v_delete_extra,
		"bandwidth" => $v_bandwidth
	];

	// Save backup config
	$backup_config_dir = dirname($backup_config);
	exec("sudo -u " . escapeshellarg($user) . " mkdir -p " . escapeshellarg($backup_config_dir) . " 2>&1");

	$tmp_file = tempnam("/tmp", "rclone_config_");
	file_put_contents($tmp_file, json_encode($backup_data, JSON_PRETTY_PRINT));
	exec("sudo mv " . escapeshellarg($tmp_file) . " " . escapeshellarg($backup_config));
	exec("sudo chown " . escapeshellarg($user) . ":" . escapeshellarg($user) . " " . escapeshellarg($backup_config));

	// Update cron
	updateRcloneCron($user, $v_name, $backup_data[$v_name]);

	$_SESSION["ok_msg"] = _("Cloud backup configuration has been updated successfully.");
	header("Location: /list/rclone/");
	exit();
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
	$unit = $config["schedule_unit"] ?? "minutes";

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
	$cron_cmd = "/usr/local/hestia/bin/v-run-rclone-backup " . escapeshellarg($user) . " " . escapeshellarg($remote);
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

// Render page
render_page($user, $TAB, "edit_rclone");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
