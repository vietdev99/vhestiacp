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
if (!empty($_SESSION["HAPROXY_SYSTEM"]) && $_SESSION["HAPROXY_SYSTEM"] === "yes") {
	$haproxy_installed = true;
}
if (!$haproxy_installed && file_exists('/etc/haproxy/haproxy.cfg')) {
	$haproxy_installed = true;
}

if (!$haproxy_installed) {
	header("Location: /list/haproxy/");
	exit();
}

// Parse HAProxy config for visualization
$frontends = [];
$backends = [];
$listens = [];
$connections = []; // frontend -> backends mapping

if (file_exists('/etc/haproxy/haproxy.cfg')) {
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
				saveSectionData($current_section, $current_name, $current_data, $frontends, $backends, $listens, $connections);
			}

			$current_section = $matches[1];
			$current_name = $matches[2];
			$current_data = [
				'name' => $current_name,
				'bind' => [],
				'servers' => [],
				'default_backend' => null,
				'use_backends' => [], // ACL-based routing
				'balance' => null,
				'mode' => null,
				'acls' => [],
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
			// use_backend (conditional routing)
			elseif (preg_match('/^use_backend\s+(\S+)\s+(.+)$/', $line, $matches)) {
				$current_data['use_backends'][] = [
					'backend' => $matches[1],
					'condition' => $matches[2]
				];
			}
			// ACL definitions
			elseif (preg_match('/^acl\s+(\S+)\s+(.+)$/', $line, $matches)) {
				$current_data['acls'][$matches[1]] = $matches[2];
			}
			// Balance
			elseif (preg_match('/^balance\s+(\S+)/', $line, $matches)) {
				$current_data['balance'] = $matches[1];
			}
			// Mode
			elseif (preg_match('/^mode\s+(\S+)/', $line, $matches)) {
				$current_data['mode'] = $matches[1];
			}
		}
	}

	// Save last section
	if ($current_section && $current_name) {
		saveSectionData($current_section, $current_name, $current_data, $frontends, $backends, $listens, $connections);
	}
}

function saveSectionData($section, $name, $data, &$frontends, &$backends, &$listens, &$connections) {
	if ($section === 'frontend') {
		$frontends[$name] = $data;

		// Build connections
		$conn = [];
		if ($data['default_backend']) {
			$conn[] = [
				'backend' => $data['default_backend'],
				'type' => 'default',
				'condition' => null
			];
		}
		foreach ($data['use_backends'] as $ub) {
			$conn[] = [
				'backend' => $ub['backend'],
				'type' => 'conditional',
				'condition' => $ub['condition']
			];
		}
		if (!empty($conn)) {
			$connections[$name] = $conn;
		}
	} elseif ($section === 'backend') {
		$backends[$name] = $data;
	} elseif ($section === 'listen') {
		$listens[$name] = $data;
	}
}

// Make variables available to template
$GLOBALS['frontends'] = $frontends;
$GLOBALS['backends'] = $backends;
$GLOBALS['listens'] = $listens;
$GLOBALS['connections'] = $connections;
$GLOBALS['haproxy_installed'] = $haproxy_installed;

// Render page
render_page($user, $TAB, "list_haproxy_visualize");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
