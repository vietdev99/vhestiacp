#!/bin/bash
#==========================================================================
# VHestiaCP - Fix HAProxy Ports
# Updates all nginx configs from port 80/443 to 8080/8443
#==========================================================================

HESTIA="/usr/local/hestia"
HESTIA_CONF="$HESTIA/conf/hestia.conf"

echo ""
echo "=============================================="
echo "   VHestiaCP - Fix HAProxy Ports"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo "Please run as root (sudo)"
    exit 1
fi

# Show current config
echo "Current hestia.conf:"
grep -E "^WEB_PORT=|^WEB_SSL_PORT=|^PROXY_PORT=|^PROXY_SSL_PORT=" "$HESTIA_CONF" 2>/dev/null || echo "  (none found)"
echo ""

# Check what's listening on ports
echo "Current port usage:"
ss -tlnp 2>/dev/null | grep -E ":80\s|:443\s|:8080\s|:8443\s" | awk '{print "  " $4 " -> " $6}'
echo ""

# Step 1: Update hestia.conf
echo "Step 1: Updating $HESTIA_CONF..."

for var in WEB_PORT PROXY_PORT; do
    if grep -q "^${var}=" "$HESTIA_CONF"; then
        sed -i "s|^${var}=.*|${var}='8080'|" "$HESTIA_CONF"
    else
        echo "${var}='8080'" >> "$HESTIA_CONF"
    fi
    echo "  ✅ ${var}=8080"
done

for var in WEB_SSL_PORT PROXY_SSL_PORT; do
    if grep -q "^${var}=" "$HESTIA_CONF"; then
        sed -i "s|^${var}=.*|${var}='8443'|" "$HESTIA_CONF"
    else
        echo "${var}='8443'" >> "$HESTIA_CONF"
    fi
    echo "  ✅ ${var}=8443"
done

echo ""

# Step 2: Update nginx configs using perl (reliable regex)
echo "Step 2: Updating nginx configs..."

update_ports_perl() {
    local file="$1"
    if [ -f "$file" ]; then
        # Update HTTP ports (80 -> 8080)
        perl -pi -e 's/listen\s+(\d+\.\d+\.\d+\.\d+):80(\s|;)/listen $1:8080$2/g' "$file"
        perl -pi -e 's/listen\s+80(\s|;)/listen 8080$1/g' "$file"
        perl -pi -e 's/listen\s+\[::\]:80/listen [::]:8080/g' "$file"
        
        # Update HTTPS ports (443 -> 8443)
        perl -pi -e 's/listen\s+(\d+\.\d+\.\d+\.\d+):443(\s|;)/listen $1:8443$2/g' "$file"
        perl -pi -e 's/listen\s+443(\s|;)/listen 8443$1/g' "$file"
        perl -pi -e 's/listen\s+\[::\]:443/listen [::]:8443/g' "$file"
    fi
}

# Update /etc/nginx/conf.d/*.conf (including IP configs)
echo "  Updating /etc/nginx/conf.d/*.conf..."
count=0
for conf in /etc/nginx/conf.d/*.conf; do
    update_ports_perl "$conf"
    ((count++))
done
echo "    Updated $count file(s)"

# Update /etc/nginx/conf.d/domains/*.conf
echo "  Updating /etc/nginx/conf.d/domains/*.conf..."
count=0
if [ -d /etc/nginx/conf.d/domains ]; then
    for conf in /etc/nginx/conf.d/domains/*.conf; do
        update_ports_perl "$conf"
        ((count++))
    done
fi
echo "    Updated $count file(s)"

# Update user domain configs
echo "  Updating /home/*/conf/web/*/*.nginx*.conf..."
count=0
for conf in /home/*/conf/web/*/*.nginx.conf /home/*/conf/web/*/*.nginx.ssl.conf; do
    if [ -f "$conf" ]; then
        update_ports_perl "$conf"
        ((count++))
    fi
done
echo "    Updated $count file(s)"

echo ""

# Step 3: Verify no port 80 remaining
echo "Step 3: Verifying..."
remaining=$(grep -r "listen.*:80[^0-9]" /etc/nginx/conf.d/ 2>/dev/null | grep -v "#" | wc -l)
if [ "$remaining" -gt 0 ]; then
    echo "  ⚠️ Found $remaining config(s) still with port 80:"
    grep -r "listen.*:80[^0-9]" /etc/nginx/conf.d/ 2>/dev/null | grep -v "#"
else
    echo "  ✅ All nginx configs updated"
fi

echo ""

# Step 4: Test nginx
echo "Step 4: Testing nginx configuration..."
if nginx -t 2>/dev/null; then
    echo "  ✅ Nginx config OK"
else
    echo "  ❌ Nginx config error:"
    nginx -t
    exit 1
fi

# Step 5: Restart services
echo ""
echo "Step 5: Restarting services..."

systemctl restart nginx
sleep 2

# Check nginx port
if ss -tlnp 2>/dev/null | grep -q ":8080.*nginx"; then
    echo "  ✅ Nginx now listening on port 8080"
else
    echo "  ⚠️ Nginx port check - current status:"
    ss -tlnp 2>/dev/null | grep nginx
fi

# Check if nginx still on port 80
if ss -tlnp 2>/dev/null | grep -q ":80.*nginx"; then
    echo "  ❌ WARNING: Nginx still on port 80!"
    echo "  Forcing nginx restart..."
    systemctl stop nginx
    sleep 1
    fuser -k 80/tcp 2>/dev/null || true
    sleep 1
    systemctl start nginx
    sleep 2
fi

# Check if HAProxy is installed
if systemctl is-enabled haproxy 2>/dev/null; then
    echo ""
    echo "Starting HAProxy..."
    systemctl restart haproxy
    sleep 2
    
    if ss -tlnp 2>/dev/null | grep -q ":80.*haproxy"; then
        echo "  ✅ HAProxy now listening on port 80"
    else
        echo "  ⚠️ HAProxy status:"
        systemctl status haproxy --no-pager | head -10
    fi
fi

echo ""
echo "=============================================="
echo "   Done! Final status:"
echo "=============================================="
echo ""
echo "Port usage:"
ss -tlnp 2>/dev/null | grep -E ":80\s|:443\s|:8080\s|:8443\s" | awk '{print "  " $4 " -> " $6}'
echo ""
echo "hestia.conf:"
grep -E "^WEB_PORT=|^WEB_SSL_PORT=" "$HESTIA_CONF"
echo ""
