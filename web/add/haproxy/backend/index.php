<?php
use function Hestiacp\quoteshellarg\quoteshellarg;

ob_start();
$TAB = "HAPROXY";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

// Check POST
if (!empty($_POST)) {
    verify_csrf($_POST);
    
    $name = trim($_POST['name'] ?? '');
    $mode = $_POST['mode'] ?? 'http';
    $balance = $_POST['balance'] ?? 'roundrobin';
    $servers = $_POST['servers'] ?? '';
    $options = $_POST['options'] ?? '';
    
    // Validate name
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        $_SESSION['error_msg'] = _("Invalid backend name. Use only letters, numbers, underscore and dash.");
        header("Location: /add/haproxy/backend/");
        exit();
    }
    
    // Validate servers
    if (empty($servers)) {
        $_SESSION['error_msg'] = _("At least one server is required.");
        header("Location: /add/haproxy/backend/");
        exit();
    }
    
    // Build backend config
    $new_backend = "\nbackend {$name}\n";
    $new_backend .= "    mode {$mode}\n";
    $new_backend .= "    balance {$balance}\n";
    
    // Add options
    if (!empty($options)) {
        $lines = explode("\n", $options);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $new_backend .= "    {$line}\n";
            }
        }
    }
    
    // Add servers
    $server_lines = explode("\n", $servers);
    foreach ($server_lines as $line) {
        $line = trim($line);
        if (!empty($line)) {
            // Ensure line starts with "server"
            if (strpos($line, 'server ') !== 0) {
                $line = "server {$line}";
            }
            $new_backend .= "    {$line}\n";
        }
    }
    
    // Read current config and append
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $current_config = file_get_contents($cfg_file);
        $new_config = $current_config . $new_backend;
        
        // Save to temp file and use hestia script
        $temp_config = tempnam("/tmp", "haproxy_add_be_");
        file_put_contents($temp_config, $new_config);
        chmod($temp_config, 0644);
        
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        unlink($temp_config);
        
        if ($return_var === 0) {
            $_SESSION['ok_msg'] = _("Backend added successfully.");
        } else {
            $_SESSION['error_msg'] = _("Failed to add backend: ") . implode("<br>", $output);
        }
    } else {
        $_SESSION['error_msg'] = _("HAProxy config file not found.");
    }
    
    header("Location: /list/haproxy/");
    exit();
}

// Show form
$v_name = '';
$v_mode = 'http';
$v_balance = 'roundrobin';
$v_servers = '';
$v_options = '';

render_page($user, $TAB, "add_haproxy_backend");
