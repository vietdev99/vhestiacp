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
    $bind = trim($_POST['bind'] ?? '');
    $mode = $_POST['mode'] ?? 'http';
    $default_backend = trim($_POST['default_backend'] ?? '');
    $options = $_POST['options'] ?? '';
    
    // Validate name
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        $_SESSION['error_msg'] = _("Invalid frontend name. Use only letters, numbers, underscore and dash.");
        header("Location: /add/haproxy/frontend/");
        exit();
    }
    
    // Validate bind
    if (empty($bind)) {
        $_SESSION['error_msg'] = _("Bind address is required.");
        header("Location: /add/haproxy/frontend/");
        exit();
    }
    
    // Build frontend config
    $new_frontend = "\nfrontend {$name}\n";
    $new_frontend .= "    bind {$bind}\n";
    $new_frontend .= "    mode {$mode}\n";
    
    // Add options
    if (!empty($options)) {
        $lines = explode("\n", $options);
        foreach ($lines as $line) {
            $line = trim($line);
            if (!empty($line)) {
                $new_frontend .= "    {$line}\n";
            }
        }
    }
    
    // Add default backend
    if (!empty($default_backend)) {
        $new_frontend .= "    default_backend {$default_backend}\n";
    }
    
    // Read current config and append
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $current_config = file_get_contents($cfg_file);
        $new_config = $current_config . $new_frontend;
        
        // Save to temp file and use hestia script
        $temp_config = tempnam("/tmp", "haproxy_add_fe_");
        file_put_contents($temp_config, $new_config);
        chmod($temp_config, 0644);
        
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        unlink($temp_config);
        
        if ($return_var === 0) {
            $_SESSION['ok_msg'] = _("Frontend added successfully.");
        } else {
            $_SESSION['error_msg'] = _("Failed to add frontend: ") . implode("<br>", $output);
        }
    } else {
        $_SESSION['error_msg'] = _("HAProxy config file not found.");
    }
    
    header("Location: /list/haproxy/");
    exit();
}

// Show form
$v_name = '';
$v_bind = '*:80';
$v_mode = 'http';
$v_default_backend = '';
$v_options = '';

render_page($user, $TAB, "add_haproxy_frontend");
