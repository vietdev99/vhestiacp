<?php
$TAB = "MONGODB";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// CRITICAL FIX: Get user from session
if (empty($user)) {
    $user = $_SESSION['user'] ?? '';
}
if (empty($user)) {
    $user = $_SESSION['userContext'] ?? '';
}
if (empty($user)) {
    $user = 'admin';
}

// CRITICAL FIX: Remove any surrounding quotes from user variable
// HestiaCP stores user with quotes like 'admin', which breaks escapeshellarg()
$user = trim($user, "\"'");

// Check if MongoDB is installed
$hestia_conf = "/usr/local/hestia/conf/hestia.conf";
$mongodb_installed = false;

// Check session first
if (isset($_SESSION["MONGODB_SYSTEM"]) && $_SESSION["MONGODB_SYSTEM"] === "yes") {
    $mongodb_installed = true;
}

// Fallback: check config file
if (!$mongodb_installed && file_exists($hestia_conf)) {
    $conf_content = file_get_contents($hestia_conf);
    if (preg_match("/MONGODB_SYSTEM='yes'/", $conf_content)) {
        $mongodb_installed = true;
    }
}

if (!$mongodb_installed) {
    header("Location: /list/web/");
    exit();
}

// Data - call v-list-database-mongo
$output = [];
$cmd = HESTIA_CMD . "v-list-database-mongo " . escapeshellarg($user) . " json 2>&1";
exec($cmd, $output, $return_var);
$json_output = implode("", $output);

// Parse JSON
$data = json_decode($json_output, true);
if (json_last_error() !== JSON_ERROR_NONE) {
    error_log("MongoDB JSON parse error: " . json_last_error_msg() . " - Output: " . $json_output);
    $data = [];
}
if (empty($data)) {
    $data = [];
}

// Check if Mongo Express is installed
$mongo_express_installed = false;
$mongo_express_url = "";

if (file_exists($hestia_conf)) {
    $conf_content = file_get_contents($hestia_conf);
    
    // Check multiple config keys
    if (preg_match("/MONGO_EXPRESS_SYSTEM='yes'/", $conf_content) || 
        preg_match("/MONGO_EXPRESS='yes'/", $conf_content) ||
        preg_match("/MONGOEXPRESS_SYSTEM='yes'/", $conf_content)) {
        $mongo_express_installed = true;
        
        // Get port
        if (preg_match("/MONGO_EXPRESS_PORT='(\d+)'/", $conf_content, $matches)) {
            $me_port = $matches[1];
        } elseif (preg_match("/MONGOEXPRESS_PORT='(\d+)'/", $conf_content, $matches)) {
            $me_port = $matches[1];
        } else {
            $me_port = "8081";
        }
        
        // Build URL
        $host = explode(":", $_SERVER['HTTP_HOST'])[0];
        $mongo_express_url = "http://" . $host . ":" . $me_port;
    }
}

// Also check SESSION
if (!$mongo_express_installed) {
    if (!empty($_SESSION['MONGO_EXPRESS_SYSTEM']) || !empty($_SESSION['MONGOEXPRESS_SYSTEM'])) {
        $mongo_express_installed = true;
        $me_port = $_SESSION['MONGO_EXPRESS_PORT'] ?? $_SESSION['MONGOEXPRESS_PORT'] ?? '8081';
        $host = explode(":", $_SERVER['HTTP_HOST'])[0];
        $mongo_express_url = "http://" . $host . ":" . $me_port;
    }
}

// Render page - pass data via globals (HestiaCP style)
render_page($user, $TAB, "list_mongodb", $data);

// Back uri
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
