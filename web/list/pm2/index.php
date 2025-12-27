<?php
$TAB = "PM2";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Determine if admin viewing all users or user viewing their own
$is_admin = ($_SESSION["userContext"] === "admin");

// Check if PM2 is installed
$pm2_installed = false;
exec("which pm2 2>/dev/null", $which_output, $which_return);
if ($which_return === 0 && !empty($which_output)) {
	$pm2_installed = true;
}

// Get PM2 data
$pm2_data = [];

if ($pm2_installed) {
	if ($is_admin) {
		// Admin sees all users' PM2 processes
		exec(HESTIA_CMD . "v-list-sys-pm2 json 2>&1", $output, $return_var);
		$json_output = implode('', $output);
		$pm2_data = json_decode($json_output, true);

		if (!$pm2_data || isset($pm2_data['error'])) {
			$pm2_data = ['pm2_installed' => true, 'users' => []];
		}
	} else {
		// Regular user sees only their PM2 processes
		exec(HESTIA_CMD . "v-list-user-pm2 " . escapeshellarg($user) . " json 2>&1", $output, $return_var);
		$json_output = implode('', $output);
		$user_data = json_decode($json_output, true);

		if ($user_data && !isset($user_data['error'])) {
			$pm2_data = [
				'pm2_installed' => true,
				'users' => [
					$user => $user_data['processes'] ?? []
				]
			];
		} else {
			$pm2_data = ['pm2_installed' => true, 'users' => []];
		}
	}
}

// Make variables available to template
$GLOBALS['pm2_installed'] = $pm2_installed;
$GLOBALS['pm2_data'] = $pm2_data;
$GLOBALS['is_admin'] = $is_admin;

// Render page
render_page($user, $TAB, "list_pm2");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
