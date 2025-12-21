<?php

$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user
if ($_SESSION["userContext"] != "admin") {
	header("Location: /list/user");
	exit();
}

// HAProxy paths
$haproxy_bin = "/usr/sbin/haproxy";
$v_config_path = "/etc/haproxy/haproxy.cfg";
$v_service_name = "HAPROXY";

// Check if HAProxy is installed
if (!file_exists($haproxy_bin) && !file_exists("/usr/bin/haproxy")) {
	$_SESSION["error_msg"] = _("HAProxy is not installed");
	header("Location: /list/server/");
	exit();
}

// Find haproxy binary
if (file_exists("/usr/sbin/haproxy")) {
	$haproxy_bin = "/usr/sbin/haproxy";
} elseif (file_exists("/usr/bin/haproxy")) {
	$haproxy_bin = "/usr/bin/haproxy";
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
		$new_conf = tempnam("/tmp", "haproxy_");
		$fp = fopen($new_conf, "w");
		fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
		fclose($fp);
		
		// Validate config before applying
		exec($haproxy_bin . " -c -f " . escapeshellarg($new_conf) . " 2>&1", $validate_output, $validate_return);
		
		if ($validate_return === 0) {
			// Config is valid, backup and apply it
			if (file_exists($v_config_path)) {
				copy($v_config_path, $v_config_path . ".bak");
			}
			
			// Write new config
			file_put_contents($v_config_path, str_replace("\r\n", "\n", $_POST["v_config"]));
			
			// Restart if requested
			if ($v_restart === "yes") {
				exec("systemctl restart haproxy 2>&1", $restart_output, $restart_return);
				if ($restart_return !== 0) {
					$_SESSION["error_msg"] = _("Configuration saved but HAProxy failed to restart: ") . implode("<br>", $restart_output);
				}
			}
		} else {
			$_SESSION["error_msg"] = _("Invalid HAProxy configuration: ") . implode("<br>", $validate_output);
		}
		unlink($new_conf);
	}

	// Set success message
	if (empty($_SESSION["error_msg"])) {
		$_SESSION["ok_msg"] = _("Changes have been saved.");
	}
}

// Get status
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? "running" : "stopped";

// Get version
exec($haproxy_bin . " -v 2>&1 | head -1", $version_output, $version_return);
$v_version = isset($version_output[0]) ? trim($version_output[0]) : "Unknown";

// Read config directly
$v_config = "";
if (file_exists($v_config_path)) {
	$v_config = file_get_contents($v_config_path);
}

// Render page
render_page($user, $TAB, "edit_server_haproxy");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
