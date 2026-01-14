<?php
/**
 * VHestiaCP - MongoDB Keyfile Management API
 *
 * Handles keyfile generation, upload, and download for MongoDB ReplicaSet/Sharding clusters.
 */

header("Content-Type: application/json");

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check admin
if ($_SESSION["userContext"] != "admin") {
    http_response_code(403);
    echo json_encode(["error" => "Access denied"]);
    exit();
}

// CSRF check
if (empty($_GET["token"]) || $_GET["token"] !== $_SESSION["token"]) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid token"]);
    exit();
}

$action = $_GET["action"] ?? "status";

switch ($action) {
    case "generate":
        // Generate a new keyfile
        $path = $_POST["path"] ?? "/var/lib/mongodb/keyfile";

        // Validate path - must be absolute and in allowed directories
        if (!preg_match('#^/var/lib/mongodb/|^/etc/mongodb/#', $path)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid keyfile path. Must be in /var/lib/mongodb/ or /etc/mongodb/"]);
            exit();
        }

        // Ensure directory exists
        $dir = dirname($path);
        exec("mkdir -p " . escapeshellarg($dir) . " 2>&1", $mkdir_output, $mkdir_return);

        // Generate 756-byte random key
        $cmd = "openssl rand -base64 756 > " . escapeshellarg($path) . " 2>&1";
        exec($cmd, $gen_output, $gen_return);

        if ($gen_return !== 0) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to generate keyfile: " . implode("\n", $gen_output)]);
            exit();
        }

        // Set proper permissions (MongoDB requires 400 or 600)
        exec("chmod 400 " . escapeshellarg($path) . " 2>&1");
        exec("chown mongodb:mongodb " . escapeshellarg($path) . " 2>&1");

        echo json_encode([
            "success" => true,
            "message" => _("Keyfile generated successfully at") . " " . $path,
            "path" => $path
        ]);
        break;

    case "upload":
        // Upload keyfile from user
        if (empty($_FILES["keyfile"]) || $_FILES["keyfile"]["error"] !== UPLOAD_ERR_OK) {
            http_response_code(400);
            echo json_encode(["error" => "No file uploaded or upload error"]);
            exit();
        }

        $path = $_POST["path"] ?? "/var/lib/mongodb/keyfile";

        // Validate path
        if (!preg_match('#^/var/lib/mongodb/|^/etc/mongodb/#', $path)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid keyfile path. Must be in /var/lib/mongodb/ or /etc/mongodb/"]);
            exit();
        }

        // Validate file size (MongoDB keyfile should be between 6 and 1024 characters)
        $fileSize = $_FILES["keyfile"]["size"];
        if ($fileSize < 6 || $fileSize > 2048) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid keyfile size. Must be between 6 and 2048 bytes."]);
            exit();
        }

        // Read and validate content (should be base64 or printable ASCII)
        $content = file_get_contents($_FILES["keyfile"]["tmp_name"]);
        $content = trim($content);

        // Basic validation - keyfile should contain only base64 characters or printable ASCII
        if (!preg_match('/^[A-Za-z0-9+\/=\s]+$/', $content)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid keyfile content. Must be base64 encoded."]);
            exit();
        }

        // Ensure directory exists
        $dir = dirname($path);
        exec("mkdir -p " . escapeshellarg($dir) . " 2>&1");

        // Save keyfile
        $tmpFile = tempnam("/tmp", "keyfile_");
        file_put_contents($tmpFile, $content);

        // Move to destination with proper permissions
        exec("mv " . escapeshellarg($tmpFile) . " " . escapeshellarg($path) . " 2>&1", $mv_output, $mv_return);

        if ($mv_return !== 0) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to save keyfile"]);
            exit();
        }

        // Set proper permissions
        exec("chmod 400 " . escapeshellarg($path) . " 2>&1");
        exec("chown mongodb:mongodb " . escapeshellarg($path) . " 2>&1");

        echo json_encode([
            "success" => true,
            "message" => _("Keyfile uploaded successfully to") . " " . $path,
            "path" => $path
        ]);
        break;

    case "download":
        // Download existing keyfile
        $path = $_GET["path"] ?? "/var/lib/mongodb/keyfile";

        // Validate path
        if (!preg_match('#^/var/lib/mongodb/|^/etc/mongodb/#', $path)) {
            http_response_code(400);
            echo json_encode(["error" => "Invalid keyfile path"]);
            exit();
        }

        // Check if file exists
        if (!file_exists($path)) {
            http_response_code(404);
            echo json_encode(["error" => "Keyfile not found at " . $path]);
            exit();
        }

        // Read file content (need root to read)
        exec("cat " . escapeshellarg($path), $content_lines, $cat_return);
        if ($cat_return !== 0) {
            http_response_code(500);
            echo json_encode(["error" => "Failed to read keyfile"]);
            exit();
        }
        $content = implode("\n", $content_lines);

        // Send as download
        header("Content-Type: application/octet-stream");
        header("Content-Disposition: attachment; filename=\"mongodb-keyfile\"");
        header("Content-Length: " . strlen($content));
        echo $content;
        exit();

    case "status":
        // Check keyfile status
        $path = $_GET["path"] ?? "/var/lib/mongodb/keyfile";

        $exists = file_exists($path);
        $permissions = null;
        $owner = null;

        if ($exists) {
            // Get permissions via stat
            exec("stat -c '%a' " . escapeshellarg($path) . " 2>/dev/null", $perm_output);
            $permissions = !empty($perm_output) ? $perm_output[0] : null;

            exec("stat -c '%U' " . escapeshellarg($path) . " 2>/dev/null", $owner_output);
            $owner = !empty($owner_output) ? $owner_output[0] : null;
        }

        echo json_encode([
            "exists" => $exists,
            "path" => $path,
            "permissions" => $permissions,
            "owner" => $owner,
            "valid" => $exists && ($permissions === "400" || $permissions === "600")
        ]);
        break;

    default:
        http_response_code(400);
        echo json_encode(["error" => "Invalid action"]);
}
