<?php
// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
	header("Location: /list/user");
	exit();
}

// Check POST
if (!empty($_POST)) {
	// Verify CSRF token
	verify_csrf($_POST);
	
	$name = $_POST['name'] ?? '';
	$bind = $_POST['bind'] ?? '';
	$mode = $_POST['mode'] ?? 'http';
	$default_backend = $_POST['default_backend'] ?? '';
	$options = $_POST['options'] ?? '';
	
	// Validate name
	if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
		$_SESSION['error_msg'] = _("Invalid frontend name. Use only letters, numbers, underscore and dash.");
		header("Location: /list/haproxy/");
		exit();
	}
	
	// Validate bind
	if (empty($bind)) {
		$_SESSION['error_msg'] = _("Bind address is required.");
		header("Location: /list/haproxy/");
		exit();
	}
	
	// Build frontend config
	$config = "\nfrontend {$name}\n";
	$config .= "    bind {$bind}\n";
	$config .= "    mode {$mode}\n";
	
	// Add options
	if (!empty($options)) {
		$lines = explode("\n", $options);
		foreach ($lines as $line) {
			$line = trim($line);
			if (!empty($line)) {
				$config .= "    {$line}\n";
			}
		}
	}
	
	// Add default backend
	if (!empty($default_backend)) {
		$config .= "    default_backend {$default_backend}\n";
	}
	
	// Append to haproxy.cfg
	$cfg_file = '/etc/haproxy/haproxy.cfg';
	if (file_exists($cfg_file)) {
		// Backup
		copy($cfg_file, $cfg_file . '.bak');
		
		// Append
		file_put_contents($cfg_file, $config, FILE_APPEND);
		
		// Validate config
		exec("/usr/sbin/haproxy -c -f {$cfg_file} 2>&1", $output, $return);
		
		if ($return !== 0) {
			// Restore backup
			copy($cfg_file . '.bak', $cfg_file);
			$_SESSION['error_msg'] = _("Invalid configuration: ") . implode("<br>", $output);
		} else {
			// Reload HAProxy
			exec("systemctl reload haproxy 2>&1", $reload_output, $reload_return);
			$_SESSION['ok_msg'] = _("Frontend added successfully.");
		}
	} else {
		$_SESSION['error_msg'] = _("HAProxy config file not found.");
	}
}

header("Location: /list/haproxy/");
exit();
