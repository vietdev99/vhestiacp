<?php
// API router for PM2 operations
header('Content-Type: application/json');

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
	echo json_encode(['error' => 'Access denied']);
	exit();
}

// CSRF check
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) {
	echo json_encode(['error' => 'Invalid token']);
	exit();
}

// Get action from URL path
$request_uri = $_SERVER['REQUEST_URI'];
$action = '';

if (strpos($request_uri, '/api/pm2/details/') !== false) {
	$action = 'details';
} elseif (strpos($request_uri, '/api/pm2/logs/') !== false) {
	$action = 'logs';
} else {
	echo json_encode(['error' => 'Invalid action']);
	exit();
}

$user = $_GET['user'] ?? '';
$id = intval($_GET['id'] ?? 0);

if (empty($user)) {
	echo json_encode(['error' => 'User required']);
	exit();
}

// Validate user exists
if ($user !== 'root') {
	$user_conf = "/usr/local/hestia/data/users/$user/user.conf";
	if (!file_exists($user_conf)) {
		echo json_encode(['error' => 'User not found']);
		exit();
	}
}

switch ($action) {
	case 'details':
		// Get process details
		if ($user === 'root') {
			$cmd = "pm2 jlist 2>/dev/null";
		} else {
			$home = ($user === 'root') ? '/root' : "/home/$user";
			$cmd = "sudo -u $user PM2_HOME=$home/.pm2 pm2 jlist 2>/dev/null";
		}

		exec($cmd, $output, $return_var);
		$json = implode('', $output);
		$processes = json_decode($json, true);

		if (!$processes) {
			echo json_encode(['error' => 'Failed to get PM2 processes']);
			exit();
		}

		$found = null;
		foreach ($processes as $proc) {
			if (($proc['pm_id'] ?? -1) == $id) {
				$found = $proc;
				break;
			}
		}

		if (!$found) {
			echo json_encode(['error' => 'Process not found']);
			exit();
		}

		echo json_encode(['process' => $found]);
		break;

	case 'logs':
		$lines = intval($_GET['lines'] ?? 100);
		if ($lines < 1) $lines = 100;
		if ($lines > 1000) $lines = 1000;

		$home = ($user === 'root') ? '/root' : "/home/$user";
		$pm2_logs_dir = "$home/.pm2/logs";

		// Get process info to find log file names
		if ($user === 'root') {
			$cmd = "pm2 jlist 2>/dev/null";
		} else {
			$cmd = "sudo -u $user PM2_HOME=$home/.pm2 pm2 jlist 2>/dev/null";
		}

		exec($cmd, $output, $return_var);
		$json = implode('', $output);
		$processes = json_decode($json, true);

		$proc_name = null;
		if ($processes) {
			foreach ($processes as $proc) {
				if (($proc['pm_id'] ?? -1) == $id) {
					$proc_name = $proc['name'] ?? null;
					break;
				}
			}
		}

		$out_logs = [];
		$err_logs = [];

		if ($proc_name) {
			// PM2 log files: {name}-out.log and {name}-error.log
			$out_file = "$pm2_logs_dir/{$proc_name}-out.log";
			$err_file = "$pm2_logs_dir/{$proc_name}-error.log";

			// Also try with ID suffix: {name}-{id}-out.log
			$out_file_id = "$pm2_logs_dir/{$proc_name}-{$id}-out.log";
			$err_file_id = "$pm2_logs_dir/{$proc_name}-{$id}-error.log";

			// Try ID-suffixed files first, then regular files
			if (file_exists($out_file_id)) {
				exec("tail -n $lines " . escapeshellarg($out_file_id) . " 2>/dev/null", $out_logs);
			} elseif (file_exists($out_file)) {
				exec("tail -n $lines " . escapeshellarg($out_file) . " 2>/dev/null", $out_logs);
			}

			if (file_exists($err_file_id)) {
				exec("tail -n $lines " . escapeshellarg($err_file_id) . " 2>/dev/null", $err_logs);
			} elseif (file_exists($err_file)) {
				exec("tail -n $lines " . escapeshellarg($err_file) . " 2>/dev/null", $err_logs);
			}
		}

		echo json_encode([
			'out_logs' => $out_logs,
			'err_logs' => $err_logs
		]);
		break;
}
