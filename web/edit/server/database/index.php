<?php
/**
 * VHestiaCP - Database Settings Controller
 * Unified database configuration page with tabs for each database type
 */

$TAB = "DBSETTING";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user - admin only
if ($_SESSION["userContext"] != "admin") {
	header("Location: /list/user");
	exit();
}

// Detect installed database systems
$has_mysql = isset($_SESSION["DB_SYSTEM"]) && strpos($_SESSION["DB_SYSTEM"], "mysql") !== false;
$has_pgsql = isset($_SESSION["DB_SYSTEM"]) && strpos($_SESSION["DB_SYSTEM"], "pgsql") !== false;
$has_mongodb = isset($_SESSION["MONGODB_SYSTEM"]) && $_SESSION["MONGODB_SYSTEM"] === "yes";

// Get active tab from query string, default to first available
$active_tab = $_GET["tab"] ?? "";
if (empty($active_tab)) {
	if ($has_mysql) $active_tab = "mysql";
	elseif ($has_pgsql) $active_tab = "pgsql";
	elseif ($has_mongodb) $active_tab = "mongodb";
}

// Handle POST requests
if (!empty($_POST["save"])) {
	verify_csrf($_POST);

	$save_tab = $_POST["tab"] ?? $active_tab;
	$v_restart = empty($_POST["v_restart"]) ? "no" : "yes";

	// Save configuration based on tab
	switch ($save_tab) {
		case "mysql":
			if (!empty($_POST["v_config"])) {
				exec("mktemp", $mktemp_output, $return_var);
				$new_conf = $mktemp_output[0];
				$fp = fopen($new_conf, "w");
				fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
				fclose($fp);
				exec(HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " mysql " . $v_restart, $output, $return_var);
				check_return_code($return_var, $output);
				unset($output);
				unlink($new_conf);
			}
			break;

		case "pgsql":
			if (!empty($_POST["v_config"])) {
				exec("mktemp", $mktemp_output, $return_var);
				$new_conf = $mktemp_output[0];
				$fp = fopen($new_conf, "w");
				fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
				fclose($fp);
				exec(HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " postgresql " . $v_restart, $output, $return_var);
				check_return_code($return_var, $output);
				unset($output);
				unlink($new_conf);
			}
			break;

		case "mongodb":
			if (!empty($_POST["v_config"])) {
				exec("mktemp", $mktemp_output, $return_var);
				$new_conf = $mktemp_output[0];
				$fp = fopen($new_conf, "w");
				fwrite($fp, str_replace("\r\n", "\n", $_POST["v_config"]));
				fclose($fp);
				exec(HESTIA_CMD . "v-change-sys-service-config " . $new_conf . " mongod " . $v_restart, $output, $return_var);
				check_return_code($return_var, $output);
				unset($output);
				unlink($new_conf);
			}
			break;
	}

	if (empty($_SESSION["error_msg"])) {
		$_SESSION["ok_msg"] = _("Changes have been saved.");
	}

	// Redirect to same tab
	header("Location: /edit/server/database/?tab=" . $save_tab);
	exit();
}

// Initialize data arrays
$mysql_data = [];
$pgsql_data = [];
$mongodb_data = [];

// Load MySQL/MariaDB config
if ($has_mysql) {
	exec(HESTIA_CMD . "v-list-sys-mysql-config json", $output, $return_var);
	$mysql_data = json_decode(implode("", $output), true);
	unset($output);

	$mysql_data["config_content"] = "";
	if (!empty($mysql_data["CONFIG"]["config_path"])) {
		$mysql_data["config_content"] = shell_exec(HESTIA_CMD . "v-open-fs-config " . $mysql_data["CONFIG"]["config_path"]);
	}

	// Get service status
	exec("systemctl is-active mysql 2>/dev/null || systemctl is-active mariadb 2>/dev/null", $status_output, $status_return);
	$mysql_data["status"] = ($status_return === 0) ? "running" : "stopped";

	// Get version
	exec("mysql --version 2>&1 | head -1", $version_output, $version_return);
	$mysql_data["version"] = isset($version_output[0]) ? trim($version_output[0]) : "Unknown";
	unset($version_output);
}

// Load PostgreSQL config
if ($has_pgsql) {
	exec(HESTIA_CMD . "v-list-sys-pgsql-config json", $output, $return_var);
	$pgsql_data = json_decode(implode("", $output), true);
	unset($output);

	$pgsql_data["config_content"] = "";
	$pgsql_data["options_content"] = "";
	if (!empty($pgsql_data["CONFIG"]["config_path"])) {
		$pgsql_data["config_content"] = shell_exec(HESTIA_CMD . "v-open-fs-config " . $pgsql_data["CONFIG"]["config_path"]);
	}
	if (!empty($pgsql_data["CONFIG"]["pg_hba_path"])) {
		$pgsql_data["options_content"] = shell_exec(HESTIA_CMD . "v-open-fs-config " . $pgsql_data["CONFIG"]["pg_hba_path"]);
	}

	// Get service status
	exec("systemctl is-active postgresql 2>/dev/null", $status_output, $status_return);
	$pgsql_data["status"] = ($status_return === 0) ? "running" : "stopped";

	// Get version
	exec("psql --version 2>&1 | head -1", $version_output, $version_return);
	$pgsql_data["version"] = isset($version_output[0]) ? trim($version_output[0]) : "Unknown";
	unset($version_output);
}

// Load MongoDB config
if ($has_mongodb) {
	$mongodb_data["config_path"] = "/etc/mongod.conf";
	$mongodb_data["config_content"] = "";
	if (file_exists($mongodb_data["config_path"])) {
		$mongodb_data["config_content"] = shell_exec(HESTIA_CMD . "v-open-fs-config " . $mongodb_data["config_path"]);
	}

	// Get service status
	exec("systemctl is-active mongod 2>/dev/null", $status_output, $status_return);
	$mongodb_data["status"] = ($status_return === 0) ? "running" : "stopped";

	// Get version
	exec("mongod --version 2>&1 | head -1", $version_output, $version_return);
	$mongodb_data["version"] = isset($version_output[0]) ? trim($version_output[0]) : "Unknown";
	unset($version_output);
}

// Pass data to template
$v_active_tab = $active_tab;
$v_has_mysql = $has_mysql;
$v_has_pgsql = $has_pgsql;
$v_has_mongodb = $has_mongodb;
$v_mysql_data = $mysql_data;
$v_pgsql_data = $pgsql_data;
$v_mongodb_data = $mongodb_data;

// Render page
render_page($user, $TAB, "edit_server_database");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
