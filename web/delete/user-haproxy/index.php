<?php
// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check token
verify_csrf($_GET);

// Check if HAProxy is enabled
if (empty($_SESSION["HAPROXY_SYSTEM"]) || $_SESSION["HAPROXY_SYSTEM"] !== "yes") {
	header("Location: /");
	exit();
}

// Get type (frontend or backend)
$v_type = trim($_GET["type"] ?? "backend");

// Get name
$v_name = trim($_GET["name"] ?? "");

// Validate input
if (empty($v_name)) {
	$_SESSION["error_msg"] = $v_type === "frontend"
		? _("Frontend name is required")
		: _("Backend name is required");
	header("Location: /list/user-haproxy/");
	exit();
}

if ($v_type === "frontend") {
	// Execute command for frontend
	// Note: $user is already quoted by quoteshellarg() in main.php
	exec(HESTIA_CMD . "v-delete-user-haproxy-frontend " .
		$user . " " .
		escapeshellarg($v_name),
		$output, $return_var);

	// Check result
	if ($return_var === 0) {
		$_SESSION["ok_msg"] = sprintf(_("Frontend '%s' has been deleted successfully"), $v_name);
	} else {
		$error = implode("\n", $output);
		if (empty($error)) {
			$error = _("An error occurred while deleting the frontend");
		}
		$_SESSION["error_msg"] = $error;
	}
} else {
	// Execute command for backend
	// Note: $user is already quoted by quoteshellarg() in main.php
	exec(HESTIA_CMD . "v-delete-user-haproxy-backend " .
		$user . " " .
		escapeshellarg($v_name),
		$output, $return_var);

	// Check result
	if ($return_var === 0) {
		$_SESSION["ok_msg"] = sprintf(_("Backend '%s' has been deleted successfully"), $v_name);
	} else {
		$error = implode("\n", $output);
		if (empty($error)) {
			$error = _("An error occurred while deleting the backend");
		}
		$_SESSION["error_msg"] = $error;
	}
}

header("Location: /list/user-haproxy/");
exit();
