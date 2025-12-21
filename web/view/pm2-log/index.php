<?php
$TAB = "NODEJS";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
verify_csrf($_GET);

$id = $_GET["id"] ?? "";
$name = $_GET["name"] ?? "Process";

if (empty($id) && $id !== "0") {
	header("Location: /list/nodejs/");
	exit();
}

$id = intval($id);

// Get last 100 lines of logs
exec("pm2 logs " . escapeshellarg($id) . " --nostream --lines 100 2>&1", $output, $return_var);
$logs = implode("\n", $output);

// Render page
render_page($user, $TAB, "view_pm2_log");
