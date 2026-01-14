<?php
// Bulk action handler for PM2 processes
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Verify CSRF token
verify_csrf($_POST);

// Check if admin
$is_admin = ($_SESSION["userContext"] === "admin");

// Get action and processes
$action = $_POST['action'] ?? '';
$processes = $_POST['process'] ?? [];

// Redirect based on admin status
$redirect = $is_admin ? "/list/pm2/" : "/list/nodejs/";

if (empty($action)) {
	$_SESSION["error_msg"] = _("No action selected");
	header("Location: $redirect");
	exit();
}

if (empty($processes) || !is_array($processes)) {
	$_SESSION["error_msg"] = _("No processes selected");
	header("Location: $redirect");
	exit();
}

// Valid actions
$valid_actions = ['restart', 'stop', 'delete', 'start'];
if (!in_array($action, $valid_actions)) {
	$_SESSION["error_msg"] = _("Invalid action");
	header("Location: $redirect");
	exit();
}

// Map action to script
$script_map = [
	'restart' => 'v-restart-pm2-app',
	'stop' => 'v-stop-pm2-app',
	'start' => 'v-start-pm2-app',
	'delete' => 'v-delete-pm2-app'
];

$script = $script_map[$action];
$success_count = 0;
$error_count = 0;
$errors = [];

foreach ($processes as $process) {
	// Format: username:pm_id
	$parts = explode(':', $process, 2);
	if (count($parts) !== 2) {
		$error_count++;
		$errors[] = "Invalid process format: $process";
		continue;
	}

	$target_user = $parts[0];
	$pm_id = $parts[1];

	// Non-admin can only manage their own processes
	if (!$is_admin) {
		$current_user = trim($user, "\"'");
		if ($target_user !== $current_user) {
			$error_count++;
			$errors[] = "Access denied for user: $target_user";
			continue;
		}
	}

	// Validate user exists
	if ($target_user !== 'root') {
		$user_home = "/home/$target_user";
		if (!is_dir($user_home)) {
			$error_count++;
			$errors[] = "User not found: $target_user";
			continue;
		}
	}

	// Execute action
	$cmd = HESTIA_CMD . "$script " . escapeshellarg($target_user) . " " . escapeshellarg($pm_id) . " 2>&1";
	exec($cmd, $output, $return_var);

	if ($return_var === 0) {
		$success_count++;
	} else {
		$error_count++;
		$errors[] = "Failed for $target_user:$pm_id - " . implode(" ", $output);
	}
	$output = [];
}

// Set result messages
if ($success_count > 0) {
	$action_past = [
		'restart' => _('restarted'),
		'stop' => _('stopped'),
		'start' => _('started'),
		'delete' => _('deleted')
	];
	$_SESSION["ok_msg"] = sprintf(_("%d PM2 process(es) %s successfully."), $success_count, $action_past[$action]);
}

if ($error_count > 0) {
	$_SESSION["error_msg"] = sprintf(_("%d PM2 process(es) failed."), $error_count);
	if (!empty($errors)) {
		$_SESSION["error_msg"] .= " " . implode("; ", array_slice($errors, 0, 3));
	}
}

header("Location: $redirect");
exit();
