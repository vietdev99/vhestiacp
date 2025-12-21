<?php
$TAB = "HAPROXY";

// Main include
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Admin only
if ($_SESSION["userContext"] !== "admin") {
    header("Location: /list/user");
    exit();
}

$name = $_GET["name"] ?? "";
if (empty($name)) {
    header("Location: /list/haproxy/");
    exit();
}

$section_type = "backend";

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    verify_csrf($_POST);
    
    $new_config = $_POST["v_config"] ?? "";
    $new_name = $_POST["v_name"] ?? $name;
    
    if (!empty($new_config)) {
        $config_file = "/etc/haproxy/haproxy.cfg";
        $config = file_get_contents($config_file);
        
        $pattern = '/^backend\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "backend " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            copy($config_file, $config_file . ".bak");
            file_put_contents($config_file, $new_full_config);
            
            exec("/usr/sbin/haproxy -c -f " . escapeshellarg($config_file) . " 2>&1", $output, $return_var);
            
            if ($return_var === 0) {
                exec("/usr/bin/systemctl reload haproxy 2>&1", $reload_output, $reload_return);
                if ($reload_return === 0) {
                    $_SESSION["ok_msg"] = sprintf(_("Backend '%s' has been updated."), htmlspecialchars($new_name));
                } else {
                    $_SESSION["ok_msg"] = sprintf(_("Backend '%s' updated. Please restart HAProxy manually."), htmlspecialchars($new_name));
                }
                header("Location: /list/haproxy/");
                exit();
            } else {
                copy($config_file . ".bak", $config_file);
                $_SESSION["error_msg"] = _("Configuration error: ") . implode("\n", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Backend '%s' not found in config."), htmlspecialchars($name));
        }
    }
}

// Parse config
$section_config = "";
$config_file = "/etc/haproxy/haproxy.cfg";

if (file_exists($config_file)) {
    $config = file_get_contents($config_file);
    $lines = explode("\n", $config);
    
    $in_section = false;
    $section_lines = [];
    
    foreach ($lines as $line) {
        if (preg_match('/^(frontend|backend|listen|global|defaults)\s+(\S*)/', $line, $matches)) {
            if ($in_section) {
                break;
            }
            if ($matches[1] === 'backend' && $matches[2] === $name) {
                $in_section = true;
                continue;
            }
        } elseif ($in_section) {
            $section_lines[] = $line;
        }
    }
    
    $section_config = implode("\n", $section_lines);
}

$frontend_config = $section_config; // For template compatibility

render_page($user, $TAB, "edit_haproxy_section");
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
