<?php

$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user
if ($_SESSION["userContext"] != "admin") {
	header("Location: /list/user");
	exit();
}

// Check POST request
if (!empty($_POST["save"])) {
	// Check token
	verify_csrf($_POST);

	// Set restart flag
	$v_restart = "yes";
	if (empty($_POST["v_restart"])) {
		$v_restart = "no";
	}

	// Update config
	if (!empty($_POST["v_config"])) {
		exec("mktemp", $mktemp_output, $return_var);
		$new_conf = $mktemp_output[0];
		$fp = fopen($new_conf, "w");
		fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
		fclose($fp);
		exec(
			HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " mongod " . $v_restart,
			$output,
			$return_var,
		);
		check_return_code($return_var, $output);
		unset($output);
		unlink($new_conf);
	}

	// Set success message
	if (empty($_SESSION["error_msg"])) {
		$_SESSION["ok_msg"] = _("Changes have been saved.");
	}
}

// Get MongoDB info
$v_config_path = "/etc/mongod.conf";
$v_service_name = "MONGODB";

// Get status
exec("systemctl is-active mongod 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? "running" : "stopped";

// Get version
exec("mongod --version 2>&1 | head -1", $version_output, $version_return);
$v_version = isset($version_output[0]) ? trim($version_output[0]) : "Unknown";

// Read config
$v_config = "";
if (file_exists($v_config_path)) {
	$v_config = shell_exec(HESTIA_CMD . "v-open-fs-config " . $v_config_path);
}

// Render page
render_page($user, $TAB, "edit_server_mongodb");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
