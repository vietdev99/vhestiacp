#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP - MongoDB Functions                                    #
#                                                                           #
#===========================================================================#

# MongoDB configuration
MONGODB_CONF="/etc/mongod.conf"
MONGODB_DATA="/var/lib/mongodb"
MONGODB_LOG="/var/log/mongodb"

# Check if MongoDB is installed
is_mongodb_installed() {
    command -v mongod &> /dev/null && [ -f "$MONGODB_CONF" ]
}

# Check if MongoDB is running
is_mongodb_running() {
    systemctl is-active --quiet mongod
}

# Get MongoDB version
get_mongodb_version() {
    if is_mongodb_installed; then
        mongod --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+\.[0-9]+'
    fi
}

# Start MongoDB
start_mongodb() {
    systemctl start mongod
    return $?
}

# Stop MongoDB
stop_mongodb() {
    systemctl stop mongod
    return $?
}

# Restart MongoDB
restart_mongodb() {
    systemctl restart mongod
    return $?
}

# Generate random password
generate_mongodb_password() {
    local length=${1:-16}
    < /dev/urandom tr -dc 'A-Za-z0-9' | head -c "$length"
}

# Connect to MongoDB and execute command
mongo_exec() {
    local command="$1"
    local admin_password="${MONGODB_ROOT_PASSWORD:-}"
    local port="${MONGODB_PORT:-27017}"
    local host="${MONGODB_HOST:-127.0.0.1}"
    local service="${MONGODB_SERVICE:-mongod}"
    
    # Check which shell is available
    local mongo_shell=""
    if command -v mongosh &>/dev/null; then
        mongo_shell="mongosh"
    elif command -v mongo &>/dev/null; then
        mongo_shell="mongo"
    else
        echo "Error: No MongoDB shell found" >&2
        return 1
    fi
    
    # Check if MongoDB instance is running
    if ! systemctl is-active --quiet $service 2>/dev/null; then
        echo "Error: MongoDB service '$service' is not running" >&2
        return 1
    fi
    
    # Load config if not set
    local HESTIA="${HESTIA:-/usr/local/hestia}"
    if [ -z "$admin_password" ] && [ -f "$HESTIA/conf/mongodb.conf" ]; then
        source "$HESTIA/conf/mongodb.conf" 2>/dev/null
        admin_password="${ROOT_PASSWORD:-}"
    fi
    
    # Check if auth is enabled in mongod.conf (check instance config first)
    local auth_enabled="no"
    local config_file="/etc/mongod.conf"
    if [ "$service" != "mongod" ] && [ -f "/etc/mongodb-instances/${service#mongod-}.conf" ]; then
        config_file="/etc/mongodb-instances/${service#mongod-}.conf"
    fi
    
    if grep -q "authorization: enabled" "$config_file" 2>/dev/null; then
        auth_enabled="yes"
    fi
    
    local result=""
    local exit_code=1
    local port_option="--port $port"
    local host_option="--host $host"
    
    # Try with authentication if password is set and auth is enabled
    if [ -n "$admin_password" ] && [ "$auth_enabled" = "yes" ]; then
        # Try 1: Without specifying mechanism (let MongoDB decide)
        result=$($mongo_shell $host_option $port_option --quiet --eval "$command" \
            -u admin -p "$admin_password" \
            --authenticationDatabase admin 2>&1)
        exit_code=$?
        if [ $exit_code -eq 0 ] && ! echo "$result" | grep -qi "auth\|unauthorized\|Authentication"; then
            echo "$result"
            return 0
        fi
        
        # Try 2: SCRAM-SHA-256 (MongoDB 4.0+ default)
        result=$($mongo_shell $host_option $port_option --quiet --eval "$command" \
            -u admin -p "$admin_password" \
            --authenticationDatabase admin \
            --authenticationMechanism "SCRAM-SHA-256" 2>&1)
        exit_code=$?
        if [ $exit_code -eq 0 ] && ! echo "$result" | grep -qi "auth\|unauthorized\|Authentication"; then
            echo "$result"
            return 0
        fi
        
        # Try 3: SCRAM-SHA-1 (older mechanism)
        result=$($mongo_shell $host_option $port_option --quiet --eval "$command" \
            -u admin -p "$admin_password" \
            --authenticationDatabase admin \
            --authenticationMechanism "SCRAM-SHA-1" 2>&1)
        exit_code=$?
        if [ $exit_code -eq 0 ] && ! echo "$result" | grep -qi "auth\|unauthorized\|Authentication"; then
            echo "$result"
            return 0
        fi
    fi
    
    # Try without authentication (no auth mode or auth not yet enabled)
    if [ "$auth_enabled" != "yes" ]; then
        result=$($mongo_shell $host_option $port_option --quiet --eval "$command" 2>&1)
        exit_code=$?
        
        if [ $exit_code -eq 0 ]; then
            echo "$result"
            return 0
        fi
    fi
    
    # All attempts failed
    if echo "$result" | grep -qi "auth\|unauthorized\|Authentication"; then
        echo "Error: MongoDB authentication failed" >&2
    else
        echo "Error: $result" >&2
    fi
    return 1
}

# Check if database exists
is_mongodb_database_exists() {
    local db_name="$1"
    local result=$(mongo_exec "db.adminCommand('listDatabases').databases.map(d => d.name).includes('$db_name')")
    [ "$result" = "true" ]
}

# Check if user exists
is_mongodb_user_exists() {
    local username="$1"
    local db_name="${2:-admin}"
    local result=$(mongo_exec "db.getSiblingDB('$db_name').getUser('$username') !== null")
    [ "$result" = "true" ]
}

# Create database
create_mongodb_database() {
    local db_name="$1"
    
    # In MongoDB, databases are created implicitly
    # We create a collection to actually create the database
    mongo_exec "db.getSiblingDB('$db_name').createCollection('_vhestiacp_init')"
    return $?
}

# Delete database
delete_mongodb_database() {
    local db_name="$1"
    
    mongo_exec "db.getSiblingDB('$db_name').dropDatabase()"
    return $?
}

# Create user
create_mongodb_user() {
    local username="$1"
    local password="$2"
    local db_name="$3"
    local roles="${4:-readWrite}"
    
    # Get auth method from config
    local auth_method=""
    if [ -f "$HESTIA/conf/hestia.conf" ]; then
        auth_method=$(grep "^MONGODB_AUTH=" "$HESTIA/conf/hestia.conf" 2>/dev/null | cut -d"'" -f2)
    fi
    
    # Determine mechanisms based on auth method
    local mechanisms_clause=""
    case "$auth_method" in
        scram256)
            mechanisms_clause=", mechanisms: ['SCRAM-SHA-256']"
            ;;
        scram1)
            mechanisms_clause=", mechanisms: ['SCRAM-SHA-1']"
            ;;
        *)
            # Default: let MongoDB decide (both mechanisms)
            mechanisms_clause=""
            ;;
    esac
    
    mongo_exec "
        db.getSiblingDB('$db_name').createUser({
            user: '$username',
            pwd: '$password',
            roles: [{ role: '$roles', db: '$db_name' }]$mechanisms_clause
        })
    "
    return $?
}

# Delete user
delete_mongodb_user() {
    local username="$1"
    local db_name="$2"
    
    mongo_exec "db.getSiblingDB('$db_name').dropUser('$username')"
    return $?
}

# Change user password
change_mongodb_password() {
    local username="$1"
    local new_password="$2"
    local db_name="$3"
    
    mongo_exec "
        db.getSiblingDB('$db_name').changeUserPassword('$username', '$new_password')
    "
    return $?
}

# List databases
list_mongodb_databases() {
    mongo_exec "db.adminCommand('listDatabases').databases.forEach(d => print(d.name))"
}

# List users for a database
list_mongodb_users() {
    local db_name="$1"
    mongo_exec "db.getSiblingDB('$db_name').getUsers().forEach(u => print(u.user))"
}

# Get database stats
get_mongodb_database_stats() {
    local db_name="$1"
    mongo_exec "JSON.stringify(db.getSiblingDB('$db_name').stats())"
}

# Dump database
dump_mongodb_database() {
    local db_name="$1"
    local output_dir="$2"
    local admin_password="${MONGODB_ROOT_PASSWORD:-}"
    
    mkdir -p "$output_dir"
    
    if [ -n "$admin_password" ]; then
        mongodump --db "$db_name" --out "$output_dir" -u admin -p "$admin_password" --authenticationDatabase admin
    else
        mongodump --db "$db_name" --out "$output_dir"
    fi
    return $?
}

# Restore database
restore_mongodb_database() {
    local db_name="$1"
    local input_dir="$2"
    local admin_password="${MONGODB_ROOT_PASSWORD:-}"
    
    if [ -n "$admin_password" ]; then
        mongorestore --db "$db_name" "$input_dir/$db_name" -u admin -p "$admin_password" --authenticationDatabase admin
    else
        mongorestore --db "$db_name" "$input_dir/$db_name"
    fi
    return $?
}

# Setup authentication
setup_mongodb_auth() {
    local root_password="$1"
    local auth_method="${2:-scram}"
    local HESTIA="${HESTIA:-/usr/local/hestia}"
    
    # Escape password for JavaScript (escape single quotes and backslashes)
    local escaped_password=$(echo "$root_password" | sed "s/\\\\/\\\\\\\\/g" | sed "s/'/\\\\'/g")
    
    # Detect mongo shell
    local mongo_shell=""
    if command -v mongosh &>/dev/null; then
        mongo_shell="mongosh"
    elif command -v mongo &>/dev/null; then
        mongo_shell="mongo"
    else
        echo "  ❌ Error: No MongoDB shell found" >&2
        return 1
    fi
    
    # IMPORTANT: Make sure auth is disabled before creating user
    echo "  Ensuring authentication is disabled temporarily..."
    if grep -q "authorization: enabled" "$MONGODB_CONF" 2>/dev/null; then
        sed -i 's/authorization: enabled/authorization: disabled/' "$MONGODB_CONF"
        systemctl restart mongod
        sleep 3
    fi
    
    # Also remove security section entirely if it exists
    if grep -q "^security:" "$MONGODB_CONF" 2>/dev/null; then
        sed -i '/^security:/d' "$MONGODB_CONF"
        sed -i '/^  authorization:/d' "$MONGODB_CONF"
        systemctl restart mongod
        sleep 3
    fi
    
    # Wait for MongoDB to be ready
    local retry=0
    while [ $retry -lt 15 ]; do
        if $mongo_shell --quiet --eval "db.runCommand({ping:1}).ok" 2>/dev/null | grep -q "1"; then
            echo "  ✅ MongoDB is ready"
            break
        fi
        echo "  Waiting for MongoDB to be ready... ($retry/15)"
        sleep 2
        ((retry++))
    done
    
    if [ $retry -eq 15 ]; then
        echo "  ❌ MongoDB failed to start"
        return 1
    fi
    
    # Create JavaScript file for user creation (avoids "use admin" output issue)
    local js_file="/tmp/mongodb_create_admin_$$.js"
    cat > "$js_file" << JSEOF
// Switch to admin database
var adminDb = db.getSiblingDB('admin');

// Drop existing admin user if exists
try {
    adminDb.dropUser('admin');
    print('DROPPED_EXISTING');
} catch(e) {
    print('NO_EXISTING_USER');
}

// Create admin user
try {
    adminDb.createUser({
        user: 'admin',
        pwd: '$escaped_password',
        roles: [
            { role: 'userAdminAnyDatabase', db: 'admin' },
            { role: 'dbAdminAnyDatabase', db: 'admin' },
            { role: 'readWriteAnyDatabase', db: 'admin' },
            { role: 'clusterAdmin', db: 'admin' },
            { role: 'root', db: 'admin' }
        ]
    });
    print('USER_CREATED_OK');
} catch(e) {
    print('CREATE_ERROR: ' + e.message);
}

// Verify user exists
var user = adminDb.getUser('admin');
if (user) {
    print('USER_VERIFIED_OK');
} else {
    print('USER_NOT_FOUND');
}
JSEOF
    
    echo "  Creating admin user..."
    local create_result=$($mongo_shell --quiet "$js_file" 2>&1)
    rm -f "$js_file"
    
    # Check results
    if echo "$create_result" | grep -q "USER_CREATED_OK"; then
        echo "  ✅ Admin user created successfully"
    elif echo "$create_result" | grep -q "CREATE_ERROR"; then
        echo "  ⚠️ User creation error: $create_result"
    fi
    
    if echo "$create_result" | grep -q "USER_VERIFIED_OK"; then
        echo "  ✅ Admin user verified"
    else
        echo "  ❌ CRITICAL: Admin user verification failed!"
        echo "  Output: $create_result"
        echo "  Trying alternative method..."
        
        # Alternative method using direct command
        $mongo_shell --quiet --eval "
            db.getSiblingDB('admin').createUser({
                user: 'admin',
                pwd: '$escaped_password',
                roles: ['root', 'userAdminAnyDatabase', 'dbAdminAnyDatabase', 'readWriteAnyDatabase']
            })
        " 2>/dev/null
        
        # Verify again
        local verify=$($mongo_shell --quiet --eval "db.getSiblingDB('admin').getUser('admin') ? 'EXISTS' : 'NOT_FOUND'" 2>/dev/null)
        if [ "$verify" = "EXISTS" ]; then
            echo "  ✅ Admin user created with alternative method"
        else
            echo "  ❌ All methods failed. Run reset-mongodb-password.sh after installation."
            return 1
        fi
    fi
    
    # Enable authentication in config
    echo "  Enabling authentication in config..."
    
    # Remove any existing security section first
    sed -i '/^security:/,/^[a-z]/{ /^security:/d; /^  authorization/d; }' "$MONGODB_CONF" 2>/dev/null
    
    # Add security section
    cat >> "$MONGODB_CONF" << EOF

security:
  authorization: enabled
EOF
    
    # Save password to config file
    mkdir -p "$HESTIA/conf"
    cat > "$HESTIA/conf/mongodb.conf" << EOF
# VHestiaCP MongoDB Configuration
# Generated: $(date)
ROOT_PASSWORD='$root_password'
AUTH_METHOD='$auth_method'
EOF
    chmod 600 "$HESTIA/conf/mongodb.conf"
    echo "  ✅ Password saved to $HESTIA/conf/mongodb.conf"
    
    return 0
}

# Setup replica set
setup_mongodb_replicaset() {
    local replica_name="${1:-rs0}"
    local members="$2"  # comma-separated list of host:port
    
    # Configure replica set in mongod.conf
    if ! grep -q "^replication:" "$MONGODB_CONF"; then
        cat >> "$MONGODB_CONF" << EOF

replication:
  replSetName: $replica_name
EOF
    fi
    
    restart_mongodb
    sleep 5
    
    # Initialize replica set
    local member_config=""
    local i=0
    IFS=',' read -ra ADDR <<< "$members"
    for member in "${ADDR[@]}"; do
        if [ $i -gt 0 ]; then
            member_config+=","
        fi
        member_config+="{ _id: $i, host: \"$member\" }"
        ((i++))
    done
    
    mongo_exec "
        rs.initiate({
            _id: '$replica_name',
            members: [$member_config]
        })
    "
    return $?
}

# Add replica member
add_mongodb_replica_member() {
    local host_port="$1"
    
    mongo_exec "rs.add('$host_port')"
    return $?
}

# Remove replica member
remove_mongodb_replica_member() {
    local host_port="$1"
    
    mongo_exec "rs.remove('$host_port')"
    return $?
}

# Get replica set status
get_mongodb_replica_status() {
    mongo_exec "JSON.stringify(rs.status())"
}

# Change authentication method
change_mongodb_auth() {
    local method="$1"  # scram, ldap, x509
    
    case "$method" in
        scram)
            sed -i '/^security:/,/^[a-z]/ { s/authorization:.*/authorization: enabled/ }' "$MONGODB_CONF"
            ;;
        ldap)
            # LDAP configuration would need additional parameters
            echo "LDAP configuration requires additional setup"
            ;;
        x509)
            # x509 configuration
            echo "x509 configuration requires certificate setup"
            ;;
    esac
    
    restart_mongodb
    return $?
}

# Get connection string
get_mongodb_connection_string() {
    local username="$1"
    local password="$2"
    local db_name="$3"
    local host="${4:-localhost}"
    local port="${5:-27017}"
    
    echo "mongodb://${username}:${password}@${host}:${port}/${db_name}?authSource=${db_name}"
}

# Log function
log_mongodb_event() {
    local level="$1"
    local message="$2"
    local log_dir="${HESTIA:-/usr/local/hestia}/log"
    local log_file="$log_dir/mongodb.log"
    
    # Create log directory if not exists
    mkdir -p "$log_dir"
    
    echo "$(date '+%Y-%m-%d %H:%M:%S') [${level}] ${message}" >> "$log_file"
}

# Store user database info
store_mongodb_user_db() {
    local user="$1"
    local db_name="$2"
    local db_user="$3"
    local db_password="$4"
    local host="${5:-localhost}"
    
    local user_dir="$HESTIA/data/users/$user"
    local user_db_conf="$user_dir/mongodb.conf"
    
    # Create directory if not exists
    mkdir -p "$user_dir"
    
    # Create file if not exists
    touch "$user_db_conf"
    
    # Remove existing entry
    sed -i "/^DB='$db_name'/d" "$user_db_conf"
    
    # Add new entry
    echo "DB='$db_name' USER='$db_user' PASSWORD='$db_password' HOST='$host' TYPE='mongodb'" >> "$user_db_conf"
}

# Remove user database info
remove_mongodb_user_db() {
    local user="$1"
    local db_name="$2"
    
    local user_db_conf="$HESTIA/data/users/$user/mongodb.conf"
    
    if [ -f "$user_db_conf" ]; then
        sed -i "/^DB='$db_name'/d" "$user_db_conf"
    fi
}

# List user's MongoDB databases
list_user_mongodb_databases() {
    local user="$1"
    local user_db_conf="$HESTIA/data/users/$user/mongodb.conf"
    
    if [ -f "$user_db_conf" ]; then
        cat "$user_db_conf"
    fi
}
