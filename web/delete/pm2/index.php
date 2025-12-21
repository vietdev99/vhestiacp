<?php
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
verify_csrf($_GET);

// Get user from session and strip quotes
if (empty($user)) {
    $user = $_SESSION['user'] ?? '';
}
if (empty($user)) {
    $user = $_SESSION['userContext'] ?? '';
}
if (empty($user)) {
    $user = 'admin';
}
$user = trim($user, "\"'");

$id = $_GET["id"] ?? "";
if (empty($id)) {
    header("Location: /list/nodejs/");
    exit();
}

// Use v-delete-pm2-app script which handles PM2_HOME correctly
$cmd = HESTIA_CMD . "v-delete-pm2-app " . escapeshellarg($user) . " " . escapeshellarg($id) . " 2>&1";
exec($cmd, $output, $return_var);

if ($return_var === 0) {
    $_SESSION["ok_msg"] = sprintf(_("PM2 process %s has been deleted."), htmlspecialchars($id));
} else {
    $_SESSION["error_msg"] = sprintf(_("Failed to delete PM2 process: %s"), implode("\n", $output));
}

header("Location: /list/nodejs/");
exit();
