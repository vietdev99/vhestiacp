<?php
// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check token
verify_csrf($_GET);

$app = $_GET["app"] ?? "";
if (empty($app)) {
	header("Location: /list/nodejs/");
	exit();
}

// Start app
exec(HESTIA_CMD . "v-start-web-domain-nodejs " . escapeshellarg($user) . " " . escapeshellarg($app), $output, $return_var);

$_SESSION["ok_msg"] = sprintf(_("Application %s has been started."), htmlspecialchars($app));
header("Location: /list/nodejs/");
exit();
