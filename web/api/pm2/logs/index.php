<?php
// API for PM2 process logs
header('Content-Type: application/json');

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// CSRF check
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) {
	echo json_encode(['error' => 'Invalid token']);
	exit();
}

$is_admin = ($_SESSION["userContext"] === "admin");
$request_user = $_GET['user'] ?? '';
$id = intval($_GET['id'] ?? 0);
$lines = intval($_GET['lines'] ?? 100);

// Limit lines
if ($lines < 1) $lines = 100;
if ($lines > 1000) $lines = 1000;

// Non-admin can only access their own PM2
if (!$is_admin) {
	$request_user = trim($user, "\"'"); // Use logged-in user
}

if (empty($request_user)) {
	echo json_encode(['error' => 'User required']);
	exit();
}

// Validate user exists by checking home directory
if ($request_user !== 'root') {
	$user_home = "/home/$request_user";
	if (!is_dir($user_home)) {
		echo json_encode(['error' => 'User not found']);
		exit();
	}
}

// Non-admin cannot access root or other users
if (!$is_admin && $request_user !== trim($user, "\"'")) {
	echo json_encode(['error' => 'Access denied']);
	exit();
}

// Get PM2 home directory
$home = ($request_user === 'root') ? '/root' : "/home/$request_user";
$pm2_logs_dir = "$home/.pm2/logs";

// Get process info to find log file names
if ($request_user === 'root') {
	$cmd = "pm2 jlist 2>/dev/null";
} else {
	$cmd = "sudo -u " . escapeshellarg($request_user) . " PM2_HOME=$home/.pm2 pm2 jlist 2>/dev/null";
}

exec($cmd, $output, $return_var);
$json = implode('', $output);
$processes = json_decode($json, true);

$proc_name = null;
$out_log_path = null;
$err_log_path = null;

if ($processes) {
	foreach ($processes as $proc) {
		if (($proc['pm_id'] ?? -1) == $id) {
			$proc_name = $proc['name'] ?? null;
			// PM2 stores full log paths in pm2_env
			$out_log_path = $proc['pm2_env']['pm_out_log_path'] ?? null;
			$err_log_path = $proc['pm2_env']['pm_err_log_path'] ?? null;
			break;
		}
	}
}

$out_logs = [];
$err_logs = [];

if ($proc_name) {
	// Try paths from pm2_env first, then fallback to standard paths
	$out_files = array_filter([
		$out_log_path,
		"$pm2_logs_dir/{$proc_name}-{$id}-out.log",
		"$pm2_logs_dir/{$proc_name}-out.log"
	]);

	$err_files = array_filter([
		$err_log_path,
		"$pm2_logs_dir/{$proc_name}-{$id}-error.log",
		"$pm2_logs_dir/{$proc_name}-error.log"
	]);

	// Find and read stdout logs
	foreach ($out_files as $out_file) {
		if ($out_file && file_exists($out_file)) {
			exec("tail -n " . escapeshellarg($lines) . " " . escapeshellarg($out_file) . " 2>/dev/null", $out_logs);
			break;
		}
	}

	// Find and read stderr logs
	foreach ($err_files as $err_file) {
		if ($err_file && file_exists($err_file)) {
			exec("tail -n " . escapeshellarg($lines) . " " . escapeshellarg($err_file) . " 2>/dev/null", $err_logs);
			break;
		}
	}
}

echo json_encode([
	'process_name' => $proc_name,
	'out_logs' => $out_logs,
	'err_logs' => $err_logs,
	'out_log_path' => $out_log_path,
	'err_log_path' => $err_log_path
]);
