#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP - HAProxy Functions                                    #
#                                                                           #
#===========================================================================#

# Check if HAProxy is installed
is_haproxy_installed() {
    if [ -f /etc/haproxy/haproxy.cfg ]; then
        return 0
    else
        return 1
    fi
}

# Check if HAProxy is running
is_haproxy_running() {
    if systemctl is-active --quiet haproxy; then
        return 0
    else
        return 1
    fi
}

# Get HAProxy version
get_haproxy_version() {
    if is_haproxy_installed; then
        haproxy -v 2>/dev/null | head -1 | awk '{print $3}'
    fi
}

# Generate random password for HAProxy stats
generate_haproxy_password() {
    local length=${1:-16}
    < /dev/urandom tr -dc 'A-Za-z0-9!@#$%^&*' | head -c "$length"
}

# Validate HAProxy configuration
validate_haproxy_config() {
    haproxy -c -f /etc/haproxy/haproxy.cfg 2>&1
    return $?
}

# Reload HAProxy service
reload_haproxy() {
    systemctl reload haproxy
    return $?
}

# Restart HAProxy service
restart_haproxy() {
    systemctl restart haproxy
    return $?
}

# Get HAProxy stats
get_haproxy_stats() {
    local stats_socket="/var/run/haproxy/admin.sock"
    if [ -S "$stats_socket" ]; then
        echo "show stat" | socat stdio "$stats_socket"
    fi
}

# Check if backend exists
is_haproxy_backend_exists() {
    local backend_name="$1"
    grep -q "^backend $backend_name$" /etc/haproxy/haproxy.cfg 2>/dev/null
    return $?
}

# Check if frontend exists
is_haproxy_frontend_exists() {
    local frontend_name="$1"
    grep -q "^frontend $frontend_name$" /etc/haproxy/haproxy.cfg 2>/dev/null
    return $?
}

# Get domain backend configuration
get_domain_haproxy_conf() {
    local domain="$1"
    local conf_file="/etc/haproxy/conf.d/${domain}.cfg"
    if [ -f "$conf_file" ]; then
        cat "$conf_file"
    fi
}

# Check if port is available
is_port_available() {
    local port="$1"
    local host="${2:-127.0.0.1}"
    ! ss -tuln | grep -q ":${port} " 
    return $?
}

# Get all registered ports
get_registered_ports() {
    local ports_file="$HESTIA/data/haproxy_ports.conf"
    if [ -f "$ports_file" ]; then
        cat "$ports_file"
    fi
}

# Register a port for a domain
register_haproxy_port() {
    local domain="$1"
    local port="$2"
    local ports_file="$HESTIA/data/haproxy_ports.conf"
    
    # Remove existing entry if any
    if [ -f "$ports_file" ]; then
        sed -i "/^${domain}:/d" "$ports_file"
    fi
    
    # Add new entry
    echo "${domain}:${port}" >> "$ports_file"
}

# Unregister a port
unregister_haproxy_port() {
    local domain="$1"
    local ports_file="$HESTIA/data/haproxy_ports.conf"
    
    if [ -f "$ports_file" ]; then
        sed -i "/^${domain}:/d" "$ports_file"
    fi
}

# Get port for a domain
get_domain_port() {
    local domain="$1"
    local ports_file="$HESTIA/data/haproxy_ports.conf"
    
    if [ -f "$ports_file" ]; then
        grep "^${domain}:" "$ports_file" | cut -d: -f2
    fi
}

# Generate HAProxy backend configuration for a domain
generate_backend_config() {
    local domain="$1"
    local backend_host="$2"
    local backend_port="$3"
    local ssl_mode="${4:-termination}"
    local health_check="${5:-yes}"
    local sticky="${6:-no}"
    local sticky_method="${7:-cookie}"
    
    local config=""
    
    config+="backend backend_${domain//\./_}\n"
    config+="    mode http\n"
    config+="    balance roundrobin\n"
    
    # Health check
    if [ "$health_check" = "yes" ]; then
        config+="    option httpchk GET /\n"
        config+="    http-check expect status 200-399\n"
    fi
    
    # Sticky sessions
    if [ "$sticky" = "yes" ]; then
        if [ "$sticky_method" = "cookie" ]; then
            config+="    cookie SERVERID insert indirect nocache\n"
        else
            config+="    stick-table type ip size 200k expire 30m\n"
            config+="    stick on src\n"
        fi
    fi
    
    # Server definition
    local server_opts="check"
    if [ "$sticky" = "yes" ] && [ "$sticky_method" = "cookie" ]; then
        server_opts+=" cookie server1"
    fi
    
    config+="    server server1 ${backend_host}:${backend_port} ${server_opts}\n"
    
    # Error page for maintenance
    config+="    errorfile 503 /etc/haproxy/errors/503.http\n"
    
    echo -e "$config"
}

# Generate HAProxy frontend ACL for a domain
generate_frontend_acl() {
    local domain="$1"
    local backend_name="backend_${domain//\./_}"
    
    local config=""
    config+="    acl host_${domain//\./_} hdr(host) -i ${domain}\n"
    config+="    acl host_${domain//\./_} hdr(host) -i www.${domain}\n"
    config+="    use_backend ${backend_name} if host_${domain//\./_}\n"
    
    echo -e "$config"
}

# Add SSL certificate to HAProxy
add_haproxy_ssl_cert() {
    local domain="$1"
    local cert_path="$2"
    local key_path="$3"
    local haproxy_cert_dir="/etc/haproxy/certs"
    
    # Create certs directory if not exists
    mkdir -p "$haproxy_cert_dir"
    
    # Combine cert and key into PEM file
    cat "$cert_path" "$key_path" > "${haproxy_cert_dir}/${domain}.pem"
    chmod 600 "${haproxy_cert_dir}/${domain}.pem"
}

# Remove SSL certificate from HAProxy
remove_haproxy_ssl_cert() {
    local domain="$1"
    local haproxy_cert_dir="/etc/haproxy/certs"
    
    rm -f "${haproxy_cert_dir}/${domain}.pem"
}

# Generate maintenance page
generate_maintenance_page() {
    local title="${1:-Maintenance}"
    local message="${2:-We are currently performing scheduled maintenance. Please try again later.}"
    
    cat << EOF
HTTP/1.0 503 Service Unavailable
Cache-Control: no-cache
Connection: close
Content-Type: text/html

<!DOCTYPE html>
<html>
<head>
    <title>${title}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }
        .container {
            text-align: center;
            padding: 40px;
            background: rgba(255,255,255,0.1);
            border-radius: 20px;
            backdrop-filter: blur(10px);
        }
        h1 { font-size: 3em; margin-bottom: 20px; }
        p { font-size: 1.2em; opacity: 0.9; }
        .icon { font-size: 5em; margin-bottom: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="icon">🔧</div>
        <h1>${title}</h1>
        <p>${message}</p>
    </div>
</body>
</html>
EOF
}

# Check HAProxy configuration syntax
check_haproxy_syntax() {
    haproxy -c -f /etc/haproxy/haproxy.cfg > /dev/null 2>&1
    return $?
}

# Rebuild HAProxy configuration from domain configs
rebuild_haproxy_config() {
    local base_config="/etc/haproxy/haproxy.cfg.base"
    local main_config="/etc/haproxy/haproxy.cfg"
    local conf_dir="/etc/haproxy/conf.d"
    
    # Start with base config
    if [ -f "$base_config" ]; then
        cat "$base_config" > "$main_config"
    fi
    
    # Append domain configurations
    if [ -d "$conf_dir" ]; then
        for conf in "$conf_dir"/*.cfg; do
            if [ -f "$conf" ]; then
                echo "" >> "$main_config"
                echo "# Domain config: $(basename $conf)" >> "$main_config"
                cat "$conf" >> "$main_config"
            fi
        done
    fi
    
    # Validate and reload
    if check_haproxy_syntax; then
        reload_haproxy
        return 0
    else
        return 1
    fi
}

# Get backend status from HAProxy stats
get_backend_status() {
    local backend_name="$1"
    local stats_socket="/var/run/haproxy/admin.sock"
    
    if [ -S "$stats_socket" ]; then
        echo "show stat" | socat stdio "$stats_socket" | grep "^${backend_name}," | head -1
    fi
}

# Enable/disable backend server
set_backend_state() {
    local backend_name="$1"
    local server_name="$2"
    local state="$3"  # ready, drain, maint
    local stats_socket="/var/run/haproxy/admin.sock"
    
    if [ -S "$stats_socket" ]; then
        echo "set server ${backend_name}/${server_name} state ${state}" | socat stdio "$stats_socket"
    fi
}

# Rate limiting configuration
generate_rate_limit_config() {
    local domain="$1"
    local requests="$2"
    local period="$3"  # second, minute, hour
    
    local stick_table_size="100k"
    local expire_time="1m"
    
    case "$period" in
        second) expire_time="10s" ;;
        minute) expire_time="1m" ;;
        hour) expire_time="1h" ;;
    esac
    
    cat << EOF
    # Rate limiting for ${domain}
    stick-table type ip size ${stick_table_size} expire ${expire_time} store http_req_rate(${expire_time})
    http-request track-sc0 src
    http-request deny deny_status 429 if { sc_http_req_rate(0) gt ${requests} }
EOF
}

# Log functions
log_haproxy_event() {
    local level="$1"
    local message="$2"
    local log_file="/var/log/hestia/haproxy.log"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [${level}] ${message}" >> "$log_file"
}
