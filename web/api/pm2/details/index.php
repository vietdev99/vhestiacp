<?php
// API for PM2 process details
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

// Non-admin can only access their own PM2
if (!$is_admin) {
	$request_user = $user; // Use logged-in user
}

if (empty($request_user)) {
	echo json_encode(['error' => 'User required']);
	exit();
}

// Validate user exists by checking home directory (web server can access this)
if ($request_user !== 'root') {
	$user_home = "/home/$request_user";
	if (!is_dir($user_home)) {
		echo json_encode(['error' => 'User not found']);
		exit();
	}
}

// Non-admin cannot access root or other users
if (!$is_admin && $request_user !== $user) {
	echo json_encode(['error' => 'Access denied']);
	exit();
}

// Get process details
if ($request_user === 'root') {
	$cmd = "pm2 jlist 2>/dev/null";
} else {
	$home = "/home/$request_user";
	$cmd = "sudo -u " . escapeshellarg($request_user) . " PM2_HOME=$home/.pm2 pm2 jlist 2>/dev/null";
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
