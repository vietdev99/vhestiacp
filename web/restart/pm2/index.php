<?php
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
verify_csrf($_GET);

// Check if this is admin PM2 management
$is_admin_pm2 = isset($_GET['user']) && $_SESSION["userContext"] === "admin";

if ($is_admin_pm2) {
	// Admin managing PM2 for any user
	$target_user = $_GET['user'] ?? '';
	$id = $_GET["id"] ?? "all";
	$redirect = "/list/pm2/";

	if (empty($target_user)) {
		$_SESSION["error_msg"] = _("User required");
		header("Location: $redirect");
		exit();
	}

	// Validate user exists by checking home directory
	if ($target_user !== 'root') {
		$user_home = "/home/$target_user";
		if (!is_dir($user_home)) {
			$_SESSION["error_msg"] = _("User not found");
			header("Location: $redirect");
			exit();
		}
	}
} else {
	// Regular user managing their own PM2
	if (empty($user)) {
		$user = $_SESSION['user'] ?? '';
	}
	if (empty($user)) {
		$user = $_SESSION['userContext'] ?? '';
	}
	if (empty($user)) {
		$user = 'admin';
	}
	$target_user = trim($user, "\"'");
	$id = $_GET["id"] ?? "all";
	$redirect = "/list/nodejs/";
}

// Use v-restart-pm2-app script which handles PM2_HOME correctly
$cmd = HESTIA_CMD . "v-restart-pm2-app " . escapeshellarg($target_user) . " " . escapeshellarg($id) . " 2>&1";
exec($cmd, $output, $return_var);

if ($return_var === 0) {
	if ($id === "all") {
		$_SESSION["ok_msg"] = _("All PM2 processes have been restarted.");
	} else {
		$_SESSION["ok_msg"] = sprintf(_("PM2 process %s has been restarted."), htmlspecialchars($id));
	}
} else {
	$_SESSION["error_msg"] = sprintf(_("Failed to restart PM2 process: %s"), implode("\n", $output));
}

header("Location: $redirect");
exit();
