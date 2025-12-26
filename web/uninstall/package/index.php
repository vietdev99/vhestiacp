<?php

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user
if ($_SESSION["userContext"] != "admin") {
    header("Location: /list/user");
    exit();
}

// Verify CSRF token
if (empty($_GET["token"]) || $_GET["token"] !== $_SESSION["token"]) {
    header("Location: /list/server/");
    exit();
}

// Package whitelist for security
$allowed_packages = [
    // Web Stack
    "haproxy" => "v-delete-sys-haproxy",
    "nginx" => "v-delete-sys-nginx",
    "apache2" => "v-delete-sys-apache",

    // Databases
    "mysql" => "v-delete-sys-mysql",
    "postgresql" => "v-delete-sys-pgsql",
    "mongodb" => "v-delete-sys-mongodb",
    "redis" => "v-delete-sys-redis",

    // Message Queue
    "rabbitmq" => "v-delete-sys-rabbitmq",
    "kafka" => "v-delete-sys-kafka",

    // Mail Stack
    "exim" => "v-delete-sys-exim",
    "dovecot" => "v-delete-sys-dovecot",
    "clamav" => "v-delete-sys-clamav",
    "spamd" => "v-delete-sys-spamd",

    // DNS
    "bind" => "v-delete-sys-bind",

    // FTP
    "vsftpd" => "v-delete-sys-vsftpd",
    "proftpd" => "v-delete-sys-proftpd",

    // Runtime
    "nodejs" => "v-delete-sys-nodejs",
    "python" => "v-delete-sys-python",

    // Security & Tools
    "fail2ban" => "v-delete-sys-fail2ban",
    "firewall" => "v-delete-sys-firewall",
    "filemanager" => "v-delete-sys-filemanager",
    "webterminal" => "v-delete-sys-web-terminal",
];

// Get package from request
$package = isset($_GET["package"]) ? $_GET["package"] : "";

// Validate package
if (empty($package) || !isset($allowed_packages[$package])) {
    $_SESSION["error_msg"] = _("Invalid package specified.");
    header("Location: /list/packages/");
    exit();
}

// Get the command to run
$uninstall_cmd = $allowed_packages[$package];

// Execute uninstallation
exec(HESTIA_CMD . escapeshellcmd($uninstall_cmd) . " 2>&1", $output, $return_var);

if ($return_var === 0) {
    $_SESSION["ok_msg"] = sprintf(_("Package %s has been uninstalled successfully."), $package);
} else {
    $error_output = implode("\n", $output);
    if (empty($error_output)) {
        $error_output = sprintf(_("Uninstallation failed with error code %d"), $return_var);
    }
    $_SESSION["error_msg"] = sprintf(_("Failed to uninstall %s: %s"), $package, $error_output);
}

// Log action
$log_msg = ($return_var === 0) ? "Package uninstalled" : "Package uninstallation failed";
exec(HESTIA_CMD . "v-log-action system Info Plugins \"" . escapeshellarg($log_msg . " (Package: " . $package . ")") . "\"");

// Redirect back to packages list
header("Location: /list/packages/");
exit();
