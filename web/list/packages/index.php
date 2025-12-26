<?php

$TAB = "SERVER";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user
if ($_SESSION["userContext"] != "admin") {
    header("Location: /list/user");
    exit();
}

// Get package data
exec(HESTIA_CMD . "v-list-sys-packages json", $output, $return_var);
$packages = [];

if ($return_var === 0 && !empty($output)) {
    $json = implode("", $output);
    $packages = json_decode($json, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        $packages = [];
    }
}

// Category icons mapping
$category_icons = [
    "web" => "fa-globe",
    "database" => "fa-database",
    "queue" => "fa-envelope",
    "mail" => "fa-inbox",
    "dns" => "fa-globe-americas",
    "ftp" => "fa-folder-open",
    "runtime" => "fa-code",
    "security" => "fa-shield-halved",
    "tools" => "fa-toolbox",
];

// Category colors
$category_colors = [
    "web" => "icon-blue",
    "database" => "icon-green",
    "queue" => "icon-orange",
    "mail" => "icon-purple",
    "dns" => "icon-maroon",
    "ftp" => "icon-yellow",
    "runtime" => "icon-teal",
    "security" => "icon-red",
    "tools" => "icon-gray",
];

// Back button title
$back = _("Server");

// Render page
render_page($user, $TAB, "list_sys_packages");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
