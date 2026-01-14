<?php
/**
 * VHestiaCP - Delete Rclone Remote
 */

ob_start();

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

// Delete from rclone config
exec("sudo -u " . escapeshellarg($user) . " rclone config delete " . escapeshellarg($v_name) . " --config=" . escapeshellarg($rclone_config) . " 2>&1", $output, $return);

// Remove from backup config
if (file_exists($backup_config)) {
	$backup_data = json_decode(file_get_contents($backup_config), true) ?? [];
	if (isset($backup_data[$v_name])) {
		unset($backup_data[$v_name]);
		$tmp_file = tempnam("/tmp", "rclone_config_");
		file_put_contents($tmp_file, json_encode($backup_data, JSON_PRETTY_PRINT));
		exec("sudo mv " . escapeshellarg($tmp_file) . " " . escapeshellarg($backup_config));
		exec("sudo chown " . escapeshellarg($user) . ":" . escapeshellarg($user) . " " . escapeshellarg($backup_config));
	}
}

// Remove cron
exec("crontab -u " . escapeshellarg($user) . " -l 2>/dev/null | grep -v 'VHESTIA_RCLONE_$v_name' | crontab -u " . escapeshellarg($user) . " -");

if ($return === 0) {
	$_SESSION["ok_msg"] = _("Cloud backup remote has been deleted successfully.");
} else {
	$_SESSION["error_msg"] = _("Failed to delete remote.");
}

header("Location: /list/rclone/");
exit();
