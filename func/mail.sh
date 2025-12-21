#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP - Mail/Exim Functions                                  #
#                                                                           #
#===========================================================================#

# Exim configuration paths
EXIM_CONF="/etc/exim4/exim4.conf.template"
EXIM_CONF_D="/etc/exim4/conf.d"
EXIM_UPDATE_CONF="/etc/exim4/update-exim4.conf.conf"

# Check if Exim is installed
is_exim_installed() {
    command -v exim4 &> /dev/null
}

# Check if Exim is running
is_exim_running() {
    systemctl is-active --quiet exim4
}

# Get Exim version
get_exim_version() {
    if is_exim_installed; then
        exim4 --version 2>/dev/null | head -1 | grep -oE '[0-9]+\.[0-9]+'
    fi
}

# Detect public IP (for multi-NIC servers)
detect_public_ip() {
    local public_ip=""
    
    # Method 1: External services
    for service in "ifconfig.me" "icanhazip.com" "ipinfo.io/ip" "api.ipify.org"; do
        public_ip=$(curl -s -4 --connect-timeout 3 "https://$service" 2>/dev/null)
        if [[ "$public_ip" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "$public_ip"
            return 0
        fi
    done
    
    # Method 2: Hestia config
    if [ -n "$SERVER_IP" ]; then
        echo "$SERVER_IP"
        return 0
    fi
    
    # Method 3: First public IP from interfaces
    for ip in $(hostname -I); do
        if ! is_private_ip "$ip"; then
            echo "$ip"
            return 0
        fi
    done
    
    return 1
}

# Check if IP is private
is_private_ip() {
    local ip="$1"
    
    if echo "$ip" | grep -qE "^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.|127\.)"; then
        return 0  # Is private
    fi
    
    return 1  # Is public
}

# Get current Exim outgoing interface
get_exim_interface() {
    if [ -f "$EXIM_CONF" ]; then
        grep "interface = " "$EXIM_CONF" | head -1 | awk -F'= ' '{print $2}'
    fi
}

# Check if Exim is using wrong interface
is_exim_interface_wrong() {
    local current_if=$(get_exim_interface)
    
    if [ -z "$current_if" ]; then
        # No interface set - might use wrong one
        # Check if server has multiple interfaces
        local ip_count=$(hostname -I | wc -w)
        if [ "$ip_count" -gt 1 ]; then
            return 0  # Potentially wrong
        fi
    else
        # Check if current interface is private
        if is_private_ip "$current_if"; then
            return 0  # Wrong - using private IP
        fi
    fi
    
    return 1  # OK
}

# Set Exim outgoing interface
set_exim_interface() {
    local ip="$1"
    
    if [ ! -f "$EXIM_CONF" ]; then
        return 1
    fi
    
    # Check if interface is already set
    if grep -q "interface = " "$EXIM_CONF"; then
        sed -i "s/interface = .*/interface = $ip/" "$EXIM_CONF"
    else
        # Add to remote_smtp transport
        sed -i '/remote_smtp:/,/^[a-z]/ {
            /driver = smtp/a\  interface = '"$ip"'
        }' "$EXIM_CONF"
    fi
    
    # Update and restart
    update-exim4.conf 2>/dev/null
    systemctl restart exim4
    
    return $?
}

# Get all server IPs
get_server_ips() {
    hostname -I
}

# Get primary IP (first public IP)
get_primary_ip() {
    for ip in $(get_server_ips); do
        if ! is_private_ip "$ip"; then
            echo "$ip"
            return 0
        fi
    done
    
    # Fallback to first IP
    hostname -I | awk '{print $1}'
}

# Check DKIM setup
is_dkim_configured() {
    local domain="$1"
    
    [ -f "/etc/exim4/dkim/${domain}.private" ] && \
    [ -f "/etc/exim4/dkim/${domain}.public" ]
}

# Get DKIM public key
get_dkim_public_key() {
    local domain="$1"
    local key_file="/etc/exim4/dkim/${domain}.public"
    
    if [ -f "$key_file" ]; then
        cat "$key_file" | grep -v "^-" | tr -d '\n'
    fi
}

# Check SPF record suggestion
get_spf_record() {
    local ip="${1:-$(get_primary_ip)}"
    echo "v=spf1 a mx ip4:$ip ~all"
}

# Check DMARC record suggestion
get_dmarc_record() {
    local domain="$1"
    echo "v=DMARC1; p=quarantine; rua=mailto:dmarc@$domain"
}

# Test outgoing mail
test_outgoing_mail() {
    local to_email="$1"
    local from_email="${2:-test@$(hostname -f)}"
    
    echo "Testing mail delivery to $to_email..."
    
    echo "Subject: VHestiaCP Mail Test
From: $from_email
To: $to_email

This is a test email from VHestiaCP to verify mail configuration.
Server: $(hostname -f)
IP: $(get_primary_ip)
Date: $(date)
" | exim4 -v "$to_email" 2>&1
}

# Get mail queue count
get_mail_queue_count() {
    exim4 -bpc 2>/dev/null || echo "0"
}

# Flush mail queue
flush_mail_queue() {
    exim4 -qff
}

# Get mail log summary
get_mail_log_summary() {
    local lines="${1:-100}"
    
    if [ -f /var/log/exim4/mainlog ]; then
        echo "=== Last $lines Mail Log Entries ==="
        tail -n "$lines" /var/log/exim4/mainlog
    fi
}

# Check for common mail issues
diagnose_mail_issues() {
    echo "Mail System Diagnostics"
    echo "═══════════════════════════════════════════════════════════"
    echo ""
    
    # Check Exim status
    echo "1. Exim Status:"
    if is_exim_running; then
        echo "   ✅ Exim4 is running"
    else
        echo "   ❌ Exim4 is NOT running"
    fi
    echo ""
    
    # Check interface
    echo "2. Network Interface:"
    local current_if=$(get_exim_interface)
    if [ -n "$current_if" ]; then
        if is_private_ip "$current_if"; then
            echo "   ❌ Using private IP: $current_if (PROBLEM!)"
            echo "   → Run: v-fix-exim-interface"
        else
            echo "   ✅ Using public IP: $current_if"
        fi
    else
        echo "   ⚠️  No specific interface set"
        local ip_count=$(hostname -I | wc -w)
        if [ "$ip_count" -gt 1 ]; then
            echo "   → Server has multiple IPs - recommend running: v-fix-exim-interface"
        fi
    fi
    echo ""
    
    # Check mail queue
    echo "3. Mail Queue:"
    local queue=$(get_mail_queue_count)
    echo "   Messages in queue: $queue"
    if [ "$queue" -gt 100 ]; then
        echo "   ⚠️  Large queue - check for issues"
    fi
    echo ""
    
    # Check ports
    echo "4. Mail Ports:"
    for port in 25 465 587; do
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "   ✅ Port $port is listening"
        else
            echo "   ⚠️  Port $port not listening"
        fi
    done
    echo ""
    
    # Check DNS
    echo "5. DNS Records (for $(hostname -f)):"
    local domain=$(hostname -f)
    echo "   MX: $(dig +short MX $domain 2>/dev/null | head -1 || echo 'Not found')"
    echo "   SPF: $(dig +short TXT $domain 2>/dev/null | grep spf || echo 'Not found')"
    echo ""
    
    # Recent errors
    echo "6. Recent Errors:"
    if [ -f /var/log/exim4/mainlog ]; then
        grep -i "error\|fail\|reject" /var/log/exim4/mainlog | tail -5 || echo "   No recent errors"
    fi
}

# Auto-fix Exim interface on mail domain creation
auto_fix_exim_interface() {
    # Check if multi-NIC server
    local ip_count=$(hostname -I | wc -w)
    
    if [ "$ip_count" -le 1 ]; then
        return 0  # Single IP, no fix needed
    fi
    
    # Check if already configured correctly
    if ! is_exim_interface_wrong; then
        return 0  # Already OK
    fi
    
    # Auto-detect and set public IP
    local public_ip=$(detect_public_ip)
    if [ -n "$public_ip" ]; then
        set_exim_interface "$public_ip"
        log_mail_event "INFO" "Auto-configured Exim interface to $public_ip"
        return 0
    fi
    
    return 1
}

# Log mail event
log_mail_event() {
    local level="$1"
    local message="$2"
    local log_dir="${HESTIA:-/usr/local/hestia}/log"
    local log_file="$log_dir/mail.log"
    
    mkdir -p "$log_dir"
    echo "$(date '+%Y-%m-%d %H:%M:%S') [${level}] ${message}" >> "$log_file"
}
