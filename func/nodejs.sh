#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP - Node.js Functions                                    #
#                                                                           #
#===========================================================================#

# NVM directory
export NVM_DIR="/opt/nvm"

# Load NVM
load_nvm() {
    if [ -s "$NVM_DIR/nvm.sh" ]; then
        . "$NVM_DIR/nvm.sh"
        return 0
    fi
    return 1
}

# Check if NVM is installed
is_nvm_installed() {
    [ -d "$NVM_DIR" ] && [ -s "$NVM_DIR/nvm.sh" ]
}

# Check if specific Node.js version is installed
is_nodejs_version_installed() {
    local version="$1"
    load_nvm
    nvm ls "$version" 2>/dev/null | grep -q "v$version"
}

# Get installed Node.js versions
get_installed_nodejs_versions() {
    load_nvm
    nvm ls --no-colors 2>/dev/null | grep -oE 'v[0-9]+\.[0-9]+\.[0-9]+' | sed 's/v//' | sort -V
}

# Get default Node.js version
get_default_nodejs_version() {
    load_nvm
    nvm current 2>/dev/null | sed 's/v//'
}

# Install Node.js version
install_nodejs_version() {
    local version="$1"
    load_nvm
    nvm install "$version"
    return $?
}

# Uninstall Node.js version
uninstall_nodejs_version() {
    local version="$1"
    load_nvm
    nvm uninstall "$version"
    return $?
}

# Set default Node.js version
set_default_nodejs_version() {
    local version="$1"
    load_nvm
    nvm alias default "$version"
    return $?
}

# Check if PM2 is installed globally
is_pm2_installed() {
    command -v pm2 &> /dev/null
}

# Install PM2 globally
install_pm2() {
    load_nvm
    npm install -g pm2
    return $?
}

# Get PM2 version
get_pm2_version() {
    if is_pm2_installed; then
        pm2 --version 2>/dev/null
    fi
}

# Setup PM2 for a user
setup_pm2_for_user() {
    local user="$1"
    local homedir="${HOMEDIR:-/home}/$user"
    
    # Create PM2 home directory
    mkdir -p "$homedir/.pm2"
    chown -R "$user:$user" "$homedir/.pm2"
    
    # Setup PM2 startup for user
    runuser -l "$user" -c "pm2 startup systemd -u $user --hp $homedir 2>/dev/null" || true
}

# Check if port is in use
is_port_in_use() {
    local port="$1"
    ss -tuln | grep -q ":${port} "
}

# Get next available port in range
get_next_available_port() {
    local start_port="${1:-3000}"
    local end_port="${2:-4000}"
    local port=$start_port
    
    while [ $port -le $end_port ]; do
        if ! is_port_in_use $port; then
            echo $port
            return 0
        fi
        ((port++))
    done
    
    return 1
}

# Check port conflicts from registered ports
check_port_conflict() {
    local port="$1"
    local domain="$2"
    local ports_file="$HESTIA/data/nodejs_ports.conf"
    
    if [ -f "$ports_file" ]; then
        # Check if port is already registered to another domain
        local existing=$(grep ":${port}$" "$ports_file" | grep -v "^${domain}:")
        if [ -n "$existing" ]; then
            echo "$existing" | cut -d: -f1
            return 1
        fi
    fi
    
    # Also check if port is in use by another service
    if is_port_in_use "$port"; then
        return 2
    fi
    
    return 0
}

# Register a port for a domain
register_nodejs_port() {
    local domain="$1"
    local port="$2"
    local ports_file="$HESTIA/data/nodejs_ports.conf"
    
    # Create file if not exists
    touch "$ports_file"
    
    # Remove existing entry
    sed -i "/^${domain}:/d" "$ports_file"
    
    # Add new entry
    echo "${domain}:${port}" >> "$ports_file"
}

# Unregister port
unregister_nodejs_port() {
    local domain="$1"
    local ports_file="$HESTIA/data/nodejs_ports.conf"
    
    if [ -f "$ports_file" ]; then
        sed -i "/^${domain}:/d" "$ports_file"
    fi
}

# Get port for domain
get_nodejs_port() {
    local domain="$1"
    local ports_file="$HESTIA/data/nodejs_ports.conf"
    
    if [ -f "$ports_file" ]; then
        grep "^${domain}:" "$ports_file" | cut -d: -f2
    fi
}

# Read port from package.json
get_port_from_package_json() {
    local package_json="$1"
    
    if [ -f "$package_json" ]; then
        # Try to find port in scripts or config
        python3 << PYEOF
import json
import re

try:
    with open('$package_json', 'r') as f:
        pkg = json.load(f)
    
    # Check for port in config
    if 'config' in pkg and 'port' in pkg['config']:
        print(pkg['config']['port'])
        exit(0)
    
    # Check in scripts for PORT=
    if 'scripts' in pkg:
        for script in pkg['scripts'].values():
            match = re.search(r'PORT[=:](\d+)', str(script))
            if match:
                print(match.group(1))
                exit(0)
except:
    pass

exit(1)
PYEOF
    fi
}

# Read port from .env file
get_port_from_env() {
    local env_file="$1"
    
    if [ -f "$env_file" ]; then
        grep -E '^PORT=' "$env_file" | cut -d= -f2 | tr -d '"' | tr -d "'"
    fi
}

# Get app port (tries multiple sources)
detect_app_port() {
    local app_dir="$1"
    local default_port="${2:-3000}"
    
    # Try .env first
    local port=$(get_port_from_env "$app_dir/.env")
    if [ -n "$port" ]; then
        echo "$port"
        return 0
    fi
    
    # Try package.json
    port=$(get_port_from_package_json "$app_dir/package.json")
    if [ -n "$port" ]; then
        echo "$port"
        return 0
    fi
    
    # Return default
    echo "$default_port"
}

# Get entry point from package.json
get_entry_point() {
    local package_json="$1"
    local default_entry="${2:-app.js}"
    
    if [ -f "$package_json" ]; then
        local main=$(python3 -c "import json; print(json.load(open('$package_json')).get('main', ''))" 2>/dev/null)
        if [ -n "$main" ]; then
            echo "$main"
            return 0
        fi
    fi
    
    echo "$default_entry"
}

# Create PM2 ecosystem file
create_pm2_ecosystem() {
    local user="$1"
    local domain="$2"
    local app_dir="$3"
    local entry_point="$4"
    local port="$5"
    local node_version="$6"
    
    local homedir="${HOMEDIR:-/home}/$user"
    local conf_dir="$homedir/web/$domain/conf"
    local ecosystem_file="$conf_dir/pm2.ecosystem.json"
    
    mkdir -p "$conf_dir"
    
    cat > "$ecosystem_file" << EOF
{
  "apps": [{
    "name": "${domain}",
    "script": "${app_dir}/${entry_point}",
    "cwd": "${app_dir}",
    "instances": 1,
    "exec_mode": "fork",
    "env": {
      "NODE_ENV": "production",
      "PORT": "${port}"
    },
    "env_file": "${app_dir}/.env",
    "error_file": "${homedir}/web/${domain}/logs/nodejs.error.log",
    "out_file": "${homedir}/web/${domain}/logs/nodejs.out.log",
    "log_date_format": "YYYY-MM-DD HH:mm:ss Z",
    "merge_logs": true,
    "max_memory_restart": "256M",
    "watch": false,
    "interpreter": "${NVM_DIR}/versions/node/v${node_version}/bin/node"
  }]
}
EOF
    
    chown "$user:$user" "$ecosystem_file"
    echo "$ecosystem_file"
}

# Start Node.js app with PM2
start_nodejs_app() {
    local user="$1"
    local domain="$2"
    local ecosystem_file="$3"
    
    runuser -l "$user" -c "source $NVM_DIR/nvm.sh && pm2 start $ecosystem_file" 2>/dev/null
    runuser -l "$user" -c "pm2 save" 2>/dev/null
    return $?
}

# Stop Node.js app
stop_nodejs_app() {
    local user="$1"
    local domain="$2"
    
    runuser -l "$user" -c "pm2 stop $domain" 2>/dev/null
    runuser -l "$user" -c "pm2 save" 2>/dev/null
    return $?
}

# Restart Node.js app
restart_nodejs_app() {
    local user="$1"
    local domain="$2"
    
    runuser -l "$user" -c "pm2 restart $domain" 2>/dev/null
    return $?
}

# Delete Node.js app from PM2
delete_nodejs_app() {
    local user="$1"
    local domain="$2"
    
    runuser -l "$user" -c "pm2 delete $domain" 2>/dev/null
    runuser -l "$user" -c "pm2 save" 2>/dev/null
    return $?
}

# Get app status
get_nodejs_app_status() {
    local user="$1"
    local domain="$2"
    
    local status=$(runuser -l "$user" -c "pm2 jlist" 2>/dev/null | python3 -c "
import json, sys
try:
    apps = json.load(sys.stdin)
    for app in apps:
        if app['name'] == '$domain':
            print(app['pm2_env']['status'])
            break
except:
    print('unknown')
" 2>/dev/null)
    
    echo "${status:-stopped}"
}

# Get app info
get_nodejs_app_info() {
    local user="$1"
    local domain="$2"
    
    runuser -l "$user" -c "pm2 jlist" 2>/dev/null | python3 -c "
import json, sys
try:
    apps = json.load(sys.stdin)
    for app in apps:
        if app['name'] == '$domain':
            info = app['pm2_env']
            print(f\"status={info['status']}\")
            print(f\"pid={app.get('pid', 'N/A')}\")
            print(f\"memory={app.get('monit', {}).get('memory', 0)}\")
            print(f\"cpu={app.get('monit', {}).get('cpu', 0)}\")
            print(f\"uptime={info.get('pm_uptime', 0)}\")
            print(f\"restarts={info.get('restart_time', 0)}\")
            break
except:
    print('status=unknown')
" 2>/dev/null
}

# Add environment variable to app
add_nodejs_env_var() {
    local user="$1"
    local domain="$2"
    local key="$3"
    local value="$4"
    
    local homedir="${HOMEDIR:-/home}/$user"
    local env_file="$homedir/web/$domain/nodeapp/.env"
    
    # Create .env if not exists
    touch "$env_file"
    chown "$user:$user" "$env_file"
    
    # Remove existing key if present
    sed -i "/^${key}=/d" "$env_file"
    
    # Add new key=value
    echo "${key}=${value}" >> "$env_file"
}

# Remove environment variable
delete_nodejs_env_var() {
    local user="$1"
    local domain="$2"
    local key="$3"
    
    local homedir="${HOMEDIR:-/home}/$user"
    local env_file="$homedir/web/$domain/nodeapp/.env"
    
    if [ -f "$env_file" ]; then
        sed -i "/^${key}=/d" "$env_file"
    fi
}

# List environment variables
list_nodejs_env_vars() {
    local user="$1"
    local domain="$2"
    
    local homedir="${HOMEDIR:-/home}/$user"
    local env_file="$homedir/web/$domain/nodeapp/.env"
    
    if [ -f "$env_file" ]; then
        cat "$env_file"
    fi
}

# Log function
log_nodejs_event() {
    local level="$1"
    local message="$2"
    local log_file="/var/log/hestia/nodejs.log"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [${level}] ${message}" >> "$log_file"
}
