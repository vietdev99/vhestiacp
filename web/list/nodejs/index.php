<?php
$TAB = "NODEJS";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// CRITICAL FIX: Get user from session and strip quotes
if (empty($user)) {
    $user = $_SESSION['user'] ?? '';
}
if (empty($user)) {
    $user = $_SESSION['userContext'] ?? '';
}
if (empty($user)) {
    $user = 'admin';
}
$user = trim($user, "\"'");

// Check if Node.js is enabled
if (empty($_SESSION["NODEJS_SYSTEM"]) || $_SESSION["NODEJS_SYSTEM"] !== "yes") {
	header("Location: /list/web/");
	exit();
}

// Get PM2 processes using Hestia script
$pm2_processes = [];
$output = [];

// Use v-list-pm2-apps script which runs with proper sudo
$cmd = HESTIA_CMD . "v-list-pm2-apps " . escapeshellarg($user) . " json 2>&1";
exec($cmd, $output, $return_var);

if ($return_var === 0 && !empty($output)) {
	$json = implode("", $output);
	$pm2_processes = json_decode($json, true);
	if (!is_array($pm2_processes)) {
		$pm2_processes = [];
	}
}

// Render page - $pm2_processes is used by template
render_page($user, $TAB, "list_nodejs");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
