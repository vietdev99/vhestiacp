<?php
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
verify_csrf($_GET);

$database = $_GET["database"] ?? "";
if (empty($database)) {
	header("Location: /list/mongodb/");
	exit();
}

exec(HESTIA_CMD . "v-delete-database-mongo " . escapeshellarg($user) . " " . escapeshellarg($database), $output, $return_var);

$_SESSION["ok_msg"] = sprintf(_("Database %s has been deleted."), htmlspecialchars($database));
header("Location: /list/mongodb/");
exit();
