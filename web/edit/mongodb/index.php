<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

ob_start();
$TAB = "MONGODB";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check user permissions
if ($_SESSION["userContext"] === "admin") {
	// Allow admin
} else {
	if (empty($_SESSION["MONGODB_SYSTEM"]) || $_SESSION["MONGODB_SYSTEM"] !== "yes") {
		header("Location: /list/user/");
		exit();
	}
}

// Check database param
if (empty($_GET["database"])) {
	header("Location: /list/mongodb/");
	exit();
}

$v_database = $_GET["database"];

// Get database info from user config file
$v_dbuser = "";
$user_db_conf = "/usr/local/hestia/data/users/" . $user . "/mongodb.conf";
if (file_exists($user_db_conf)) {
	$config_content = file_get_contents($user_db_conf);
	// Look for this database
	if (preg_match("/DB='" . preg_quote($v_database, "/") . "'\s+USER='([^']+)'/", $config_content, $matches)) {
		$v_dbuser = $matches[1];
	}
}

// If not found in config, try to match database name pattern
if (empty($v_dbuser)) {
	$v_dbuser = $v_database; // Default to database name
}

// Check POST request for password change
if (!empty($_POST["ok"])) {
	// Check token
	verify_csrf($_POST);

	// Change password if provided
	if (!empty($_POST["v_password"])) {
		// Check password length
		if (!validate_password($_POST["v_password"])) {
			$_SESSION["error_msg"] = _("Password does not match the minimum requirements.");
		}

		if (empty($_SESSION["error_msg"])) {
			// v-change-database-mongo-user-password USER DATABASE DBUSER PASSWORD
			// Write password to temp file for security
			$v_password_file = tempnam("/tmp", "vst");
			$fp = fopen($v_password_file, "w");
			fwrite($fp, $_POST["v_password"] . "\n");
			fclose($fp);
			
			// Read password from file
			$password = trim(file_get_contents($v_password_file));
			
			exec(
				HESTIA_CMD .
					"v-change-database-mongo-user-password " .
					quoteshellarg($user) .
					" " .
					quoteshellarg($v_database) .
					" " .
					quoteshellarg($v_dbuser) .
					" " .
					quoteshellarg($password),
				$output,
				$return_var,
			);
			check_return_code($return_var, $output);
			unset($output);
			unlink($v_password_file);
		}
	}

	if (empty($_SESSION["error_msg"])) {
		$_SESSION["ok_msg"] = _("Changes have been saved.");
	}
}

render_page($user, $TAB, "edit_mongodb");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
