<?php
// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check token
verify_csrf($_POST);

// Check if HAProxy is enabled
if (empty($_SESSION["HAPROXY_SYSTEM"]) || $_SESSION["HAPROXY_SYSTEM"] !== "yes") {
	header("Location: /");
	exit();
}

// Get type (frontend or backend)
$v_type = trim($_POST["type"] ?? "backend");

// Get POST data
$v_name = trim($_POST["name"] ?? "");
$v_port = trim($_POST["port"] ?? "");
$v_mode = trim($_POST["mode"] ?? "http");

// Validate input - name
if (empty($v_name)) {
	$_SESSION["error_msg"] = $v_type === "frontend"
		? _("Frontend name is required")
		: _("Backend name is required");
	header("Location: /list/user-haproxy/");
	exit();
}

// Validate input - port
if (empty($v_port)) {
	$_SESSION["error_msg"] = _("Port is required");
	header("Location: /list/user-haproxy/");
	exit();
}

// Validate name format
if (!preg_match('/^[a-zA-Z0-9_-]+$/', $v_name)) {
	$_SESSION["error_msg"] = $v_type === "frontend"
		? _("Frontend name can only contain letters, numbers, underscores and dashes")
		: _("Backend name can only contain letters, numbers, underscores and dashes");
	header("Location: /list/user-haproxy/");
	exit();
}

// Validate port
$v_port = intval($v_port);
if ($v_port < 1 || $v_port > 65535) {
	$_SESSION["error_msg"] = _("Invalid port number (1-65535)");
	header("Location: /list/user-haproxy/");
	exit();
}

// Validate mode
if (!in_array($v_mode, ['http', 'tcp'])) {
	$v_mode = 'http';
}

if ($v_type === "frontend") {
	// Frontend specific
	$v_default_backend = trim($_POST["default_backend"] ?? "");
	$v_options = trim($_POST["options"] ?? "");

	// Execute command for frontend
	// Note: $user is already quoted by quoteshellarg() in main.php
	$cmd = HESTIA_CMD . "v-add-user-haproxy-frontend " .
		$user . " " .
		escapeshellarg($v_name) . " " .
		escapeshellarg($v_port) . " " .
		escapeshellarg($v_mode);

	if (!empty($v_default_backend)) {
		$cmd .= " " . escapeshellarg($v_default_backend);
	} else {
		$cmd .= " ''";
	}

	if (!empty($v_options)) {
		$cmd .= " " . escapeshellarg($v_options);
	}

	exec($cmd, $output, $return_var);

	// Check result
	if ($return_var === 0) {
		$_SESSION["ok_msg"] = sprintf(_("Frontend '%s' has been created successfully"), $v_name);
	} else {
		$error = implode("\n", $output);
		if (empty($error)) {
			$error = _("An error occurred while creating the frontend");
		}
		$_SESSION["error_msg"] = $error;
	}
} else {
	// Backend specific
	$v_balance = trim($_POST["balance"] ?? "roundrobin");

	// Validate balance
	if (!in_array($v_balance, ['roundrobin', 'leastconn', 'source'])) {
		$v_balance = 'roundrobin';
	}

	// Execute command for backend
	// Note: $user is already quoted by quoteshellarg() in main.php
	exec(HESTIA_CMD . "v-add-user-haproxy-backend " .
		$user . " " .
		escapeshellarg($v_name) . " " .
		escapeshellarg($v_port) . " " .
		escapeshellarg($v_mode) . " " .
		escapeshellarg($v_balance),
		$output, $return_var);

	// Check result
	if ($return_var === 0) {
		$_SESSION["ok_msg"] = sprintf(_("Backend '%s' has been created successfully"), $v_name);
	} else {
		$error = implode("\n", $output);
		if (empty($error)) {
			$error = _("An error occurred while creating the backend");
		}
		$_SESSION["error_msg"] = $error;
	}
}

header("Location: /list/user-haproxy/");
exit();
