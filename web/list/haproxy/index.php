<?php
$TAB = "HAPROXY";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
	header("Location: /list/user");
	exit();
}

// Check if HAProxy is installed
$haproxy_installed = false;
$haproxy_data = [];

// Multiple detection methods
exec("which haproxy 2>/dev/null", $which_output, $which_return);
if ($which_return === 0 && !empty($which_output)) {
	$haproxy_installed = true;
}

if (!$haproxy_installed) {
	exec("dpkg -l haproxy 2>/dev/null | grep -q '^ii'", $dpkg_output, $dpkg_return);
	if ($dpkg_return === 0) {
		$haproxy_installed = true;
	}
}

if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) {
	$haproxy_installed = true;
}

if (!$haproxy_installed && !empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") {
	$haproxy_installed = true;
}

// Get HAProxy info if installed
if ($haproxy_installed) {
	$haproxy_data = [
		'STATUS' => 'unknown',
		'STATS' => $_SESSION['HAPROXY_STATS'] ?? 'no'
	];
	
	// Check if running
	exec("systemctl is-active haproxy 2>/dev/null", $status_output, $status_return);
	$haproxy_data['STATUS'] = ($status_return === 0) ? 'running' : 'stopped';
	
	// Get version
	exec("haproxy -v 2>&1 | head -1", $version_output);
	$haproxy_data['VERSION'] = $version_output[0] ?? 'Unknown';
}

// Parse HAProxy config for detailed info
$frontends = [];
$backends = [];
$listens = [];
$stats_info = null;

if ($haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) {
	$config = file_get_contents('/etc/haproxy/haproxy.cfg');
	$lines = explode("\n", $config);
	
	$current_section = null;
	$current_name = null;
	$current_data = [];
	
	foreach ($lines as $line) {
		$line = trim($line);
		
		// Skip comments and empty lines
		if (empty($line) || strpos($line, '#') === 0) {
			continue;
		}
		
		// Detect section start
		if (preg_match('/^(frontend|backend|listen)\s+(\S+)/', $line, $matches)) {
			// Save previous section
			if ($current_section && $current_name) {
				if ($current_section === 'frontend') {
					$frontends[$current_name] = $current_data;
				} elseif ($current_section === 'backend') {
					$backends[$current_name] = $current_data;
				} elseif ($current_section === 'listen') {
					$listens[$current_name] = $current_data;
					// Check if this is stats
					if ($current_name === 'stats' || (isset($current_data['stats_enable']) && $current_data['stats_enable'])) {
						$stats_info = $current_data;
						$stats_info['name'] = $current_name;
					}
				}
			}
			
			$current_section = $matches[1];
			$current_name = $matches[2];
			$current_data = [
				'bind' => [],
				'servers' => [],
				'options' => [],
				'default_backend' => null,
				'balance' => null,
				'mode' => null,
				'stats_enable' => false,
				'stats_uri' => null,
				'stats_auth' => null,
			];
			continue;
		}
		
		// Parse section content
		if ($current_section && $current_name) {
			// Bind
			if (preg_match('/^bind\s+(.+)$/', $line, $matches)) {
				$current_data['bind'][] = trim($matches[1]);
			}
			// Server
			elseif (preg_match('/^server\s+(\S+)\s+(\S+)(.*)$/', $line, $matches)) {
				$current_data['servers'][] = [
					'name' => $matches[1],
					'address' => $matches[2],
					'options' => trim($matches[3] ?? '')
				];
			}
			// Default backend
			elseif (preg_match('/^default_backend\s+(\S+)/', $line, $matches)) {
				$current_data['default_backend'] = $matches[1];
			}
			// Balance
			elseif (preg_match('/^balance\s+(\S+)/', $line, $matches)) {
				$current_data['balance'] = $matches[1];
			}
			// Mode
			elseif (preg_match('/^mode\s+(\S+)/', $line, $matches)) {
				$current_data['mode'] = $matches[1];
			}
			// Stats enable
			elseif (preg_match('/^stats\s+enable/', $line)) {
				$current_data['stats_enable'] = true;
			}
			// Stats uri
			elseif (preg_match('/^stats\s+uri\s+(\S+)/', $line, $matches)) {
				$current_data['stats_uri'] = $matches[1];
			}
			// Stats auth
			elseif (preg_match('/^stats\s+auth\s+(\S+)/', $line, $matches)) {
				$current_data['stats_auth'] = $matches[1];
			}
			// Other options
			elseif (preg_match('/^(option|http-request|http-response|acl|use_backend|timeout)\s+(.+)$/', $line, $matches)) {
				$current_data['options'][] = $line;
			}
		}
	}
	
	// Save last section
	if ($current_section && $current_name) {
		if ($current_section === 'frontend') {
			$frontends[$current_name] = $current_data;
		} elseif ($current_section === 'backend') {
			$backends[$current_name] = $current_data;
		} elseif ($current_section === 'listen') {
			$listens[$current_name] = $current_data;
			if ($current_name === 'stats' || (isset($current_data['stats_enable']) && $current_data['stats_enable'])) {
				$stats_info = $current_data;
				$stats_info['name'] = $current_name;
			}
		}
	}
}

// Get server hostname for stats URL
$server_host = $_SERVER["HTTP_HOST"];
if (strpos($server_host, ':') !== false) {
	$server_host = explode(':', $server_host)[0];
}

// Render page
render_page($user, $TAB, "list_haproxy");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
