<?php
/**
 * VHestiaCP - Add Rclone Remote
 */

ob_start();
$TAB = "BACKUP";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check login
if (empty($_SESSION["user"])) {
	header("Location: /login/");
	exit();
}

// Config paths
$user_home = "/home/$user";
$rclone_config = "$user_home/.config/rclone/rclone.conf";
$backup_config = "$user_home/.config/vhestia/rclone-backup.json";

// Check POST request
if (!empty($_POST["save"])) {
	// Check token
	verify_csrf($_POST);

	// Get form data
	$v_provider = $_POST["v_provider"] ?? "";
	$v_name = $_POST["v_name"] ?? "";
	$v_token = $_POST["v_token"] ?? "";
	$v_folders = $_POST["v_folders"] ?? [];
	$v_schedule_type = $_POST["v_schedule_type"] ?? "manual";
	$v_schedule_time = $_POST["v_schedule_time"] ?? "02:00";
	$v_schedule_weekday = $_POST["v_schedule_weekday"] ?? 0;
	$v_schedule_interval = $_POST["v_schedule_interval"] ?? 60;
	$v_schedule_unit = $_POST["v_schedule_unit"] ?? "minutes";
	$v_delete_extra = isset($_POST["v_delete_extra"]) ? true : false;
	$v_bandwidth = intval($_POST["v_bandwidth"] ?? 0);

	// Validate
	if (empty($v_name)) {
		$_SESSION["error_msg"] = _("Remote name is required.");
	} elseif (!preg_match('/^[a-zA-Z0-9_-]+$/', $v_name)) {
		$_SESSION["error_msg"] = _("Remote name can only contain letters, numbers, underscores and hyphens.");
	} elseif (empty($v_provider)) {
		$_SESSION["error_msg"] = _("Please select a cloud provider.");
	}

	// Process based on provider
	if (empty($_SESSION["error_msg"])) {
		$rclone_params = [];

		switch ($v_provider) {
			case "drive":
			case "dropbox":
			case "onedrive":
				// OAuth providers need token
				if (empty($v_token)) {
					$_SESSION["error_msg"] = _("OAuth token is required for this provider.");
				} else {
					$rclone_params["type"] = $v_provider;
					$rclone_params["token"] = $v_token;
					if ($v_provider === "drive" && !empty($_POST["v_folder_id"])) {
						$rclone_params["root_folder_id"] = $_POST["v_folder_id"];
					}
				}
				break;

			case "s3":
				$v_access_key = $_POST["v_access_key"] ?? "";
				$v_secret_key = $_POST["v_secret_key"] ?? "";
				$v_region = $_POST["v_region"] ?? "us-east-1";
				$v_bucket = $_POST["v_bucket"] ?? "";

				if (empty($v_access_key) || empty($v_secret_key) || empty($v_bucket)) {
					$_SESSION["error_msg"] = _("Access key, secret key, and bucket are required.");
				} else {
					$rclone_params["type"] = "s3";
					$rclone_params["provider"] = "AWS";
					$rclone_params["access_key_id"] = $v_access_key;
					$rclone_params["secret_access_key"] = $v_secret_key;
					$rclone_params["region"] = $v_region;
					// Bucket is used in sync path, not in config
				}
				break;

			case "s3compatible":
				$v_endpoint = $_POST["v_endpoint"] ?? "";
				$v_access_key = $_POST["v_access_key"] ?? "";
				$v_secret_key = $_POST["v_secret_key"] ?? "";
				$v_bucket = $_POST["v_bucket"] ?? "";

				if (empty($v_endpoint) || empty($v_access_key) || empty($v_secret_key) || empty($v_bucket)) {
					$_SESSION["error_msg"] = _("Endpoint, access key, secret key, and bucket are required.");
				} else {
					$rclone_params["type"] = "s3";
					$rclone_params["provider"] = "Other";
					$rclone_params["endpoint"] = $v_endpoint;
					$rclone_params["access_key_id"] = $v_access_key;
					$rclone_params["secret_access_key"] = $v_secret_key;
				}
				break;

			case "sftp":
				$v_sftp_host = $_POST["v_sftp_host"] ?? "";
				$v_sftp_port = $_POST["v_sftp_port"] ?? "22";
				$v_sftp_user = $_POST["v_sftp_user"] ?? "";
				$v_sftp_auth = $_POST["v_sftp_auth"] ?? "password";
				$v_sftp_pass = $_POST["v_sftp_pass"] ?? "";
				$v_sftp_key = $_POST["v_sftp_key"] ?? "";

				if (empty($v_sftp_host) || empty($v_sftp_user)) {
					$_SESSION["error_msg"] = _("Host and username are required.");
				} else {
					$rclone_params["type"] = "sftp";
					$rclone_params["host"] = $v_sftp_host;
					$rclone_params["port"] = $v_sftp_port;
					$rclone_params["user"] = $v_sftp_user;
					if ($v_sftp_auth === "password" && !empty($v_sftp_pass)) {
						$rclone_params["pass"] = $v_sftp_pass;
					} elseif ($v_sftp_auth === "key" && !empty($v_sftp_key)) {
						$rclone_params["key_file"] = $v_sftp_key;
					}
				}
				break;

			default:
				$_SESSION["error_msg"] = _("Invalid provider selected.");
		}

		// Create rclone config
		if (empty($_SESSION["error_msg"]) && !empty($rclone_params)) {
			// Ensure config directory exists
			$config_dir = dirname($rclone_config);
			exec("sudo -u " . escapeshellarg($user) . " mkdir -p " . escapeshellarg($config_dir) . " 2>&1");

			// Build rclone config create command
			$cmd = "sudo -u " . escapeshellarg($user) . " rclone config create " . escapeshellarg($v_name);
			$cmd .= " " . escapeshellarg($rclone_params["type"]);
			unset($rclone_params["type"]);

			foreach ($rclone_params as $key => $value) {
				$cmd .= " " . escapeshellarg($key) . "=" . escapeshellarg($value);
			}
			$cmd .= " --config=" . escapeshellarg($rclone_config) . " 2>&1";

			exec($cmd, $output, $return_var);

			if ($return_var !== 0) {
				$_SESSION["error_msg"] = _("Failed to create rclone config: ") . implode("\n", $output);
			} else {
				// Save backup config (folders, schedule, etc.)
				$backup_data = [];
				if (file_exists($backup_config)) {
					$backup_data = json_decode(file_get_contents($backup_config), true) ?? [];
				}

				// Filter valid folders
				$valid_folders = [];
				foreach ($v_folders as $folder) {
					if (!empty($folder["local"]) && !empty($folder["remote"])) {
						$valid_folders[] = [
							"local" => $folder["local"],
							"remote" => $folder["remote"]
						];
					}
				}

				$backup_data[$v_name] = [
					"folders" => $valid_folders,
					"schedule" => $v_schedule_type,
					"schedule_time" => $v_schedule_time,
					"schedule_weekday" => intval($v_schedule_weekday),
					"schedule_interval" => intval($v_schedule_interval),
					"schedule_unit" => $v_schedule_unit,
					"delete_extra" => $v_delete_extra,
					"bandwidth" => $v_bandwidth
				];

				// Save backup config
				$backup_config_dir = dirname($backup_config);
				exec("sudo -u " . escapeshellarg($user) . " mkdir -p " . escapeshellarg($backup_config_dir) . " 2>&1");

				$tmp_file = tempnam("/tmp", "rclone_config_");
				file_put_contents($tmp_file, json_encode($backup_data, JSON_PRETTY_PRINT));
				exec("sudo mv " . escapeshellarg($tmp_file) . " " . escapeshellarg($backup_config));
				exec("sudo chown " . escapeshellarg($user) . ":" . escapeshellarg($user) . " " . escapeshellarg($backup_config));

				// Setup cron if scheduled
				updateRcloneCron($user, $v_name, $backup_data[$v_name]);

				$_SESSION["ok_msg"] = _("Cloud backup remote has been added successfully.");
				header("Location: /list/rclone/");
				exit();
			}
		}
	}
}

/**
 * Update cron job for rclone backup
 */
function updateRcloneCron($user, $remote, $config) {
	$schedule = $config["schedule"] ?? "manual";
	if ($schedule === "manual") {
		removeRcloneCron($user, $remote);
		return;
	}

	$time = $config["schedule_time"] ?? "02:00";
	$weekday = $config["schedule_weekday"] ?? 0;
	$interval = $config["schedule_interval"] ?? 60;
	$unit = $config["schedule_unit"] ?? "minutes";

	// Parse time
	$parts = explode(":", $time);
	$hour = intval($parts[0] ?? 2);
	$minute = intval($parts[1] ?? 0);

	// Build cron expression
	switch ($schedule) {
		case "hourly":
			$cron = "0 * * * *";
			break;
		case "daily":
			$cron = "$minute $hour * * *";
			break;
		case "weekly":
			$cron = "$minute $hour * * $weekday";
			break;
		case "custom":
			if ($unit === "hours") {
				$cron = "0 */$interval * * *";
			} else {
				$cron = "*/$interval * * * *";
			}
			break;
		default:
			return;
	}

	// Add cron job
	$cron_cmd = "/usr/local/hestia/bin/v-run-rclone-backup " . escapeshellarg($user) . " " . escapeshellarg($remote);
	$cron_line = "$cron $cron_cmd # VHESTIA_RCLONE_$remote";

	// Remove old cron for this remote and add new one
	removeRcloneCron($user, $remote);
	exec("(crontab -u " . escapeshellarg($user) . " -l 2>/dev/null; echo " . escapeshellarg($cron_line) . ") | crontab -u " . escapeshellarg($user) . " -");
}

/**
 * Remove cron job for rclone backup
 */
function removeRcloneCron($user, $remote) {
	exec("crontab -u " . escapeshellarg($user) . " -l 2>/dev/null | grep -v 'VHESTIA_RCLONE_$remote' | crontab -u " . escapeshellarg($user) . " -");
}

// Render page
render_page($user, $TAB, "add_rclone");

// Flush session messages
unset($_SESSION["error_msg"]);
unset($_SESSION["ok_msg"]);
