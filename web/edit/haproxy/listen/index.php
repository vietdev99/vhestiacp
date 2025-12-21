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

$section_type = "listen";

// Handle form submission
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    verify_csrf($_POST);
    
    $new_config = $_POST["v_config"] ?? "";
    $new_name = $_POST["v_name"] ?? $name;
    
    if (!empty($new_config)) {
        $config_file = "/etc/haproxy/haproxy.cfg";
        $config = file_get_contents($config_file);
        
        $pattern = '/^listen\s+' . preg_quote($name, '/') . '\s*\n((?:(?!^(?:frontend|backend|listen|global|defaults)\s).*\n)*)/m';
        $new_section = "listen " . $new_name . "\n" . $new_config . "\n";
        
        if (preg_match($pattern, $config)) {
            $new_full_config = preg_replace($pattern, $new_section, $config);
            
            // Write to temp file for validation and update
            $temp_config = tempnam("/tmp", "haproxy_listen_");
            file_put_contents($temp_config, $new_full_config);
            
            exec("/usr/sbin/haproxy -c -f " . escapeshellarg($temp_config) . " 2>&1", $output, $return_var);
            
            if ($return_var === 0) {
                exec(HESTIA_CMD . "v-update-sys-haproxy-config " . escapeshellarg($temp_config) . " 2>&1", $reload_output, $reload_return);
                unlink($temp_config);
                
                if ($reload_return === 0) {
                    $_SESSION["ok_msg"] = sprintf(_("Listen section '%s' has been updated."), htmlspecialchars($new_name));
                } else {
                    $_SESSION["error_msg"] = sprintf(_("Listen section '%s' update failed: %s"), htmlspecialchars($new_name), implode("\n", $reload_output));
                }
                header("Location: /list/haproxy/");
                exit();
            } else {
                unlink($temp_config);
                $_SESSION["error_msg"] = _("Configuration error: ") . implode("\n", $output);
            }
        } else {
            $_SESSION["error_msg"] = sprintf(_("Listen section '%s' not found in config."), htmlspecialchars($name));
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
            if ($matches[1] === 'listen' && $matches[2] === $name) {
                $in_section = true;
                continue;
            }
        } elseif ($in_section) {
            $section_lines[] = $line;
        }
    }
    
    $section_config = implode("\n", $section_lines);
}

$frontend_config = $section_config;

render_page($user, $TAB, "edit_haproxy_section");
$_SESSION["back"] = $_SERVER["REQUEST_URI"];
