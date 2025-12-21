<?php
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
	header("Location: /list/user");
	exit();
}

// Verify token
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) {
	header("Location: /list/haproxy/");
	exit();
}

$name = $_GET['name'] ?? '';

if (!empty($name) && preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
	$cfg_file = '/etc/haproxy/haproxy.cfg';
	if (file_exists($cfg_file)) {
		$config = file_get_contents($cfg_file);
		
		// Remove backend section
		$pattern = '/\nbackend\s+' . preg_quote($name, '/') . '\s*\n([ \t]+[^\n]+\n)*/';
		$new_config = preg_replace($pattern, "\n", $config);
		
		if ($new_config !== $config) {
			// Backup
			copy($cfg_file, $cfg_file . '.bak');
			file_put_contents($cfg_file, $new_config);
			
			// Validate
			exec("/usr/sbin/haproxy -c -f {$cfg_file} 2>&1", $output, $return);
			if ($return !== 0) {
				copy($cfg_file . '.bak', $cfg_file);
				$_SESSION['error_msg'] = _("Could not remove backend - config validation failed.");
			} else {
				exec("systemctl reload haproxy 2>&1");
				$_SESSION['ok_msg'] = _("Backend deleted successfully.");
			}
		}
	}
}

header("Location: /list/haproxy/");
exit();
