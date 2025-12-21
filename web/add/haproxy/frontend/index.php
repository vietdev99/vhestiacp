<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";
if ($_SESSION["userContext"] !== "admin") { header("Location: /list/user"); exit(); }

if (!empty($_POST)) {
    verify_csrf($_POST);
    
    $name = trim($_POST['name'] ?? '');
    $bind = trim($_POST['bind'] ?? '');
    $mode = $_POST['mode'] ?? 'http';
    $default_backend = trim($_POST['default_backend'] ?? '');
    $options = $_POST['options'] ?? '';
    
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $name)) {
        $_SESSION['error_msg'] = _("Invalid frontend name.");
        header("Location: /add/haproxy/frontend/"); exit();
    }
    if (empty($bind)) {
        $_SESSION['error_msg'] = _("Bind address is required.");
        header("Location: /add/haproxy/frontend/"); exit();
    }
    
    // Auto-fix bind format: if just port number, add *:
    if (preg_match('/^\d+$/', $bind)) {
        $bind = "*:" . $bind;
    } elseif (preg_match('/^:\d+$/', $bind)) {
        $bind = "*" . $bind;
    }
    
    $new_frontend = "\nfrontend {$name}\n    bind {$bind}\n    mode {$mode}\n";
    if (!empty($options)) {
        foreach (explode("\n", $options) as $line) {
            $line = trim($line);
            if (!empty($line)) $new_frontend .= "    {$line}\n";
        }
    }
    if (!empty($default_backend)) $new_frontend .= "    default_backend {$default_backend}\n";
    
    $cfg_file = '/etc/haproxy/haproxy.cfg';
    if (file_exists($cfg_file)) {
        $new_config = file_get_contents($cfg_file) . $new_frontend;
        $temp_config = tempnam("/tmp", "haproxy_add_fe_");
        file_put_contents($temp_config, $new_config);
        chmod($temp_config, 0644);
        
        exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
        unlink($temp_config);
        
        if ($return_var === 0) {
            $_SESSION['ok_msg'] = _("Frontend added successfully.");
        } else {
            $_SESSION['error_msg'] = _("Failed: ") . implode("<br>", $output);
        }
    }
    header("Location: /list/haproxy/"); exit();
}
$v_name = ''; $v_bind = '*:80'; $v_mode = 'http'; $v_default_backend = ''; $v_options = '';
render_page($user, $TAB, "add_haproxy_frontend");
