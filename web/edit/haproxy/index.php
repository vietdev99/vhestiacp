<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

ob_start();
$TAB = "HAPROXY";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
	header("Location: /list/user");
	exit();
}

// Check if HAProxy is installed - multiple methods
$haproxy_installed = false;

// Method 1: Session variable
if (!empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") {
	$haproxy_installed = true;
}

// Method 2: Check binary
if (!$haproxy_installed) {
	exec("which haproxy 2>/dev/null", $which_output, $which_return);
	if ($which_return === 0 && !empty($which_output)) {
		$haproxy_installed = true;
	}
}

// Method 3: Check config file
if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) {
	$haproxy_installed = true;
}

if (!$haproxy_installed) {
	$_SESSION["error_msg"] = _("HAProxy is not installed");
	header("Location: /list/server/");
	exit();
}

$config_file = '/etc/haproxy/haproxy.cfg';
$v_config = "";

// Load current config
if (file_exists($config_file)) {
	$v_config = file_get_contents($config_file);
}

// Get HAProxy status directly
exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
$v_status = ($status_return === 0) ? 'running' : 'stopped';

$v_stats_enabled = $_SESSION['HAPROXY_STATS'] ?? 'no';
$v_stats_port = $_SESSION['HAPROXY_STATS_PORT'] ?? '8404';
$v_stats_user = $_SESSION['HAPROXY_STATS_USER'] ?? 'admin';

// Handle POST
if (!empty($_POST["ok"])) {
	verify_csrf($_POST);
	
	if (!empty($_POST["v_config"])) {
		// Save config to temp file and validate
		$temp_config = tempnam("/tmp", "haproxy_");
		file_put_contents($temp_config, $_POST["v_config"]);
		
		// Validate config - use full path to haproxy
		$haproxy_bin = "/usr/sbin/haproxy";
		if (!file_exists($haproxy_bin)) {
			// Try to find haproxy
			$haproxy_bin = trim(shell_exec("which haproxy 2>/dev/null"));
			if (empty($haproxy_bin)) {
				$haproxy_bin = "/usr/sbin/haproxy";
			}
		}
		
		exec($haproxy_bin . " -c -f " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
		
		if ($return_var === 0) {
			// Config is valid, use Hestia script to save and restart
			exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $restart_output, $restart_result);
			
			if ($restart_result === 0) {
				$v_config = $_POST["v_config"];
				$_SESSION["ok_msg"] = _("HAProxy configuration has been saved and service restarted.");
			} else {
				$_SESSION["error_msg"] = _("Failed to update HAProxy configuration: ") . implode("\n", $restart_output);
			}
		} else {
			$_SESSION["error_msg"] = _("Invalid HAProxy configuration: ") . implode("\n", $output);
		}
		
		unlink($temp_config);
		unset($output);
	}
}

render_page($user, $TAB, "edit_haproxy");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
