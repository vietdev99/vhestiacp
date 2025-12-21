<?php
$TAB = "PYTHON";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check if Python is enabled
if (empty($_SESSION["PYTHON_SYSTEM"]) || $_SESSION["PYTHON_SYSTEM"] !== "yes") {
	header("Location: /list/web/");
	exit();
}

// Get Python/Gunicorn/Uvicorn processes
$python_processes = [];

// Method 1: Check for systemd services with gunicorn/uvicorn
exec("systemctl list-units --type=service --state=running --no-pager 2>/dev/null | grep -E 'gunicorn|uvicorn|python' | awk '{print $1}'", $services, $return_var);

foreach ($services as $service) {
	$service = trim($service);
	if (empty($service)) continue;
	
	// Get service status
	exec("systemctl show " . escapeshellarg($service) . " --property=MainPID,ActiveState,MemoryCurrent 2>/dev/null", $status_output);
	$props = [];
	foreach ($status_output as $line) {
		list($key, $value) = explode('=', $line, 2);
		$props[$key] = $value;
	}
	
	$python_processes[] = [
		'name' => str_replace('.service', '', $service),
		'type' => 'systemd',
		'status' => $props['ActiveState'] ?? 'unknown',
		'pid' => $props['MainPID'] ?? 0,
		'memory' => isset($props['MemoryCurrent']) ? round($props['MemoryCurrent'] / 1024 / 1024, 1) : 0
	];
	unset($status_output);
}

// Method 2: Check for running gunicorn/uvicorn processes via ps
exec("ps aux | grep -E 'gunicorn|uvicorn' | grep -v grep 2>/dev/null", $ps_output);
foreach ($ps_output as $line) {
	$parts = preg_split('/\s+/', $line);
	if (count($parts) < 11) continue;
	
	$user_proc = $parts[0];
	$pid = $parts[1];
	$cpu = $parts[2];
	$mem = $parts[3];
	$command = implode(' ', array_slice($parts, 10));
	
	// Extract app name from command
	$name = 'unknown';
	if (preg_match('/gunicorn\s+(\S+)/', $command, $matches)) {
		$name = $matches[1];
	} elseif (preg_match('/uvicorn\s+(\S+)/', $command, $matches)) {
		$name = $matches[1];
	}
	
	// Avoid duplicates
	$exists = false;
	foreach ($python_processes as $proc) {
		if ($proc['pid'] == $pid) {
			$exists = true;
			break;
		}
	}
	
	if (!$exists && strpos($command, 'master') !== false) {
		$python_processes[] = [
			'name' => $name,
			'type' => 'process',
			'status' => 'running',
			'pid' => $pid,
			'cpu' => $cpu,
			'memory' => round($mem * (intval(shell_exec('free -m | grep Mem | awk \'{print $2}\'')) / 100), 1),
			'user' => $user_proc,
			'command' => $command
		];
	}
}

// Render page
render_page($user, $TAB, "list_python");

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
