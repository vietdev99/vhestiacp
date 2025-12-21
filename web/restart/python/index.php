<?php
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
verify_csrf($_GET);

$app = $_GET["app"] ?? "";
if (empty($app)) {
	header("Location: /list/python/");
	exit();
}

exec(HESTIA_CMD . "v-restart-web-domain-python " . escapeshellarg($user) . " " . escapeshellarg($app), $output, $return_var);

$_SESSION["ok_msg"] = sprintf(_("Application %s has been restarted."), htmlspecialchars($app));
header("Location: /list/python/");
exit();
