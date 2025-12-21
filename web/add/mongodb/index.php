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
	// Check if user has MongoDB enabled
	if (empty($_SESSION["MONGODB_SYSTEM"]) || $_SESSION["MONGODB_SYSTEM"] !== "yes") {
		header("Location: /list/user/");
		exit();
	}
}

// Check POST request
if (!empty($_POST["ok"])) {
	// Check token
	verify_csrf($_POST);

	// Check empty fields
	if (empty($_POST["v_database"])) {
		$errors[] = _("Database");
	}
	if (empty($_POST["v_dbuser"])) {
		$errors[] = _("Username");
	}
	if (empty($_POST["v_password"])) {
		$errors[] = _("Password");
	}
	if (!empty($errors[0])) {
		foreach ($errors as $i => $error) {
			if ($i == 0) {
				$error_msg = $error;
			} else {
				$error_msg = $error_msg . ", " . $error;
			}
		}
		$_SESSION["error_msg"] = sprintf(_('Field "%s" can not be blank.'), $error_msg);
	}

	// Check password length
	if (empty($_SESSION["error_msg"])) {
		if (!validate_password($_POST["v_password"])) {
			$_SESSION["error_msg"] = _("Password does not match the minimum requirements.");
		}
	}

	// Protect input
	$v_database = quoteshellarg($_POST["v_database"]);
	$v_dbuser = quoteshellarg($_POST["v_dbuser"]);

	// Add MongoDB database
	if (empty($_SESSION["error_msg"])) {
		$v_password = tempnam("/tmp", "vst");
		$fp = fopen($v_password, "w");
		fwrite($fp, $_POST["v_password"] . "\n");
		fclose($fp);
		exec(
			HESTIA_CMD .
				"v-add-database-mongo " .
				$user .
				" " .
				$v_database .
				" " .
				$v_dbuser .
				" " .
				$v_password,
			$output,
			$return_var,
		);
		check_return_code($return_var, $output);
		unset($output);
		unlink($v_password);
	}

	// Flush field values on success
	if (empty($_SESSION["error_msg"])) {
		$_SESSION["ok_msg"] = htmlify_trans(
			sprintf(
				_("MongoDB Database {%s} has been created successfully."),
				htmlentities($user_plain) . "_" . htmlentities($_POST["v_database"]),
			),
			"</a>",
			'<a href="/list/mongodb/">',
		);
		unset($v_database);
		unset($v_dbuser);
		unset($v_password);
	}
}

// Default values
if (empty($v_database)) {
	$v_database = "";
}
if (empty($v_dbuser)) {
	$v_dbuser = "";
}

render_page($user, $TAB, "add_mongodb");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
