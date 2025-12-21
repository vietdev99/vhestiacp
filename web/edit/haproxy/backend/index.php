<?php
use function Hestiacp\quoteshellarg\quoteshellarg;
ob_start();
$TAB = "HAPROXY";

include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

$name = $_GET["name"] ?? "";
if (empty($name)) {
    header("Location: /list/haproxy/");
    exit();
}

$config_file = "/etc/haproxy/haproxy.cfg";

// Handle POST
if (!empty($_POST["ok"])) {
    verify_csrf($_POST);
    
    $new_name = trim($_POST["v_name"] ?? $name);
    $new_config = $_POST["v_config"] ?? "";
    
    if (!empty($new_name) && !empty($new_config)) {
        $config = file_get_contents($config_file);
        $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "backend " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            $temp_config = tempnam("/tmp", "haproxy_be_");
            file_put_contents($temp_config, $new_full_config);
            
            exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            unlink($temp_config);
            
            if ($return_var === 0) {
                $_SESSION["ok_msg"] = sprintf(_("Backend '%s' has been updated."), htmlspecialchars($new_name));
                header("Location: /list/haproxy/");
                exit();
            } else {
                $_SESSION["error_msg"] = _("Failed to update: ") . implode("<br>", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Backend '%s' not found."), htmlspecialchars($name));
        }
    }
}

// Parse config
$section_config = "";
if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
    if (preg_match($pattern, $config, $matches)) {
        $section_config = trim($matches[1]);
    }
}

$v_name = $name;
$v_config = $section_config;
$v_section_type = "backend";

render_page($user, $TAB, "edit_haproxy_section");
