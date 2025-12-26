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
    "haproxy" => "v-add-sys-haproxy",
    "nginx" => "v-add-sys-nginx",
    "apache2" => "v-add-sys-apache",

    // Databases
    "mysql" => "v-add-sys-mysql",
    "postgresql" => "v-add-sys-pgsql",
    "mongodb" => "v-add-sys-mongodb",
    "redis" => "v-add-sys-redis",

    // Message Queue
    "rabbitmq" => "v-add-sys-rabbitmq",
    "kafka" => "v-add-sys-kafka",

    // Mail Stack
    "exim" => "v-add-sys-exim",
    "dovecot" => "v-add-sys-dovecot",
    "clamav" => "v-add-sys-clamav",
    "spamd" => "v-add-sys-spamd",

    // DNS
    "bind" => "v-add-sys-bind",

    // FTP
    "vsftpd" => "v-add-sys-vsftpd",
    "proftpd" => "v-add-sys-proftpd",

    // Runtime
    "nodejs" => "v-add-sys-nodejs",
    "python" => "v-add-sys-python",

    // Security & Tools
    "fail2ban" => "v-add-sys-fail2ban",
    "firewall" => "v-add-sys-firewall",
    "filemanager" => "v-add-sys-filemanager",
    "webterminal" => "v-add-sys-web-terminal",
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
$install_cmd = $allowed_packages[$package];

// Check if command exists
$cmd_path = "/usr/local/hestia/bin/" . $install_cmd;

// Execute installation
exec(HESTIA_CMD . escapeshellcmd($install_cmd) . " 2>&1", $output, $return_var);

if ($return_var === 0) {
    $_SESSION["ok_msg"] = sprintf(_("Package %s has been installed successfully."), $package);
} else {
    $error_output = implode("\n", $output);
    if (empty($error_output)) {
        $error_output = sprintf(_("Installation failed with error code %d"), $return_var);
    }
    $_SESSION["error_msg"] = sprintf(_("Failed to install %s: %s"), $package, $error_output);
}

// Log action
$log_msg = ($return_var === 0) ? "Package installed" : "Package installation failed";
exec(HESTIA_CMD . "v-log-action system Info Plugins \"" . escapeshellarg($log_msg . " (Package: " . $package . ")") . "\"");

// Redirect back to packages list
header("Location: /list/packages/");
exit();
