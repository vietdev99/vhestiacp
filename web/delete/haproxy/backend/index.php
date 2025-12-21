<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Verify token
if (empty($_GET['token']) || $_GET['token'] !== $_SESSION['token']) {
    header("Location: /list/haproxy/");
    exit();
}

$name = $_GET['name'] ?? '';

if (!empty($name) && preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $config = file_get_contents($cfg_file);
        
        // Remove backend section
        $pattern = '/\nbackend\s+' . preg_quote($name, '/') . '\s*\n([ \t]+[^\n]+\n)*/';
        $new_config = preg_replace($pattern, "\n", $config);
        
        if ($new_config !== $config) {
            // Save to temp file and use hestia script
            $temp_config = tempnam("/tmp", "haproxy_del_be_");
            file_put_contents($temp_config, $new_config);
            chmod($temp_config, 0644);
            
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            
            if ($return_var === 0) {
                $_SESSION['ok_msg'] = _("Backend deleted successfully.");
            } else {
                $_SESSION['error_msg'] = _("Failed to delete backend: ") . implode("<br>", $output);
            }
        } else {
            $_SESSION['error_msg'] = _("Backend not found.");
        }
    }
}

header("Location: /list/haproxy/");
exit();
