#!/bin/bash
#==========================================================================
# VHestiaCP - Fix HAProxy + Nginx Port Configuration
# Configures nginx to use 8080 and HAProxy to use 80/443
#==========================================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo ""
echo "=============================================="
echo "   HAProxy + Nginx Port Configuration"
echo "=============================================="
echo ""

# Check root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')
echo "Server IP: $SERVER_IP"

#----------------------------------------------------------#
# Step 1: Configure nginx to use port 8080
#----------------------------------------------------------#
echo -e "${BLUE}[1/4] Configuring nginx to use port 8080...${NC}"

# Backup nginx configs
cp -r /etc/nginx /etc/nginx.bak.$(date +%Y%m%d_%H%M%S)

# Find and update all nginx configs
find /etc/nginx -name "*.conf" -type f | while read conf_file; do
    # Replace listen 80 with listen 127.0.0.1:8080
    if grep -q "listen.*80" "$conf_file" 2>/dev/null; then
        # For default server
        perl -i -pe 's/listen\s+80\s*;/listen 127.0.0.1:8080;/g' "$conf_file"
        perl -i -pe 's/listen\s+\[::\]:80\s*;/# listen [::]:8080; # IPv6 disabled for HAProxy/g' "$conf_file"
        
        # For IP-specific listen
        perl -i -pe "s/listen\s+$SERVER_IP:80\s*;/listen 127.0.0.1:8080;/g" "$conf_file"
        perl -i -pe 's/listen\s+(\d+\.\d+\.\d+\.\d+):80\s*;/listen 127.0.0.1:8080;/g' "$conf_file"
        
        echo "  Updated: $conf_file"
    fi
done

# Also update HestiaCP nginx templates
HESTIA="/usr/local/hestia"
if [ -d "$HESTIA/data/templates/web/nginx" ]; then
    find "$HESTIA/data/templates/web/nginx" -name "*.tpl" -o -name "*.stpl" | while read tpl; do
        if grep -q "listen.*80" "$tpl" 2>/dev/null; then
            perl -i -pe 's/%ip%:80/127.0.0.1:8080/g' "$tpl"
            perl -i -pe 's/listen\s+80\s/listen 127.0.0.1:8080 /g' "$tpl"
            echo "  Updated template: $tpl"
        fi
    done
fi

echo -e "  ${GREEN}✓${NC} nginx configured for port 8080"

#----------------------------------------------------------#
# Step 2: Configure HAProxy
#----------------------------------------------------------#
echo -e "${BLUE}[2/4] Configuring HAProxy...${NC}"

cat > /etc/haproxy/haproxy.cfg << EOF
#---------------------------------------------------------------------
# VHestiaCP HAProxy Configuration
# Generated: $(date)
#---------------------------------------------------------------------

global
    log /dev/log local0
    log /dev/log local1 notice
    chroot /var/lib/haproxy
    stats socket /run/haproxy/admin.sock mode 660 level admin expose-fd listeners
    stats timeout 30s
    user haproxy
    group haproxy
    daemon
    
    # SSL settings
    ssl-default-bind-ciphersuites TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256
    ssl-default-bind-options ssl-min-ver TLSv1.2 no-tls-tickets

defaults
    log     global
    mode    http
    option  httplog
    option  dontlognull
    option  forwardfor
    option  http-server-close
    timeout connect 5000
    timeout client  50000
    timeout server  50000
    errorfile 400 /etc/haproxy/errors/400.http
    errorfile 403 /etc/haproxy/errors/403.http
    errorfile 408 /etc/haproxy/errors/408.http
    errorfile 500 /etc/haproxy/errors/500.http
    errorfile 502 /etc/haproxy/errors/502.http
    errorfile 503 /etc/haproxy/errors/503.http
    errorfile 504 /etc/haproxy/errors/504.http

#---------------------------------------------------------------------
# Stats page
#---------------------------------------------------------------------
listen stats
    bind *:8404
    mode http
    stats enable
    stats uri /stats
    stats refresh 10s
    stats auth admin:$(cat /usr/local/hestia/conf/mongodb.conf 2>/dev/null | grep ROOT_PASSWORD | cut -d"'" -f2 || echo "admin123")

#---------------------------------------------------------------------
# HTTP Frontend (Port 80)
#---------------------------------------------------------------------
frontend http_front
    bind *:80
    mode http
    
    # Add X-Forwarded headers
    option forwardfor
    http-request set-header X-Forwarded-Port %[dst_port]
    http-request set-header X-Forwarded-Proto http
    
    # Default backend
    default_backend nginx_backend

#---------------------------------------------------------------------
# HTTPS Frontend (Port 443) - TCP passthrough
#---------------------------------------------------------------------
frontend https_front
    bind *:443
    mode tcp
    option tcplog
    
    # Pass through to nginx for SSL termination
    default_backend nginx_ssl_backend

#---------------------------------------------------------------------
# Nginx HTTP Backend
#---------------------------------------------------------------------
backend nginx_backend
    mode http
    balance roundrobin
    option httpchk GET /
    http-check expect status 200-499
    server nginx1 127.0.0.1:8080 check

#---------------------------------------------------------------------
# Nginx HTTPS Backend (TCP passthrough)
#---------------------------------------------------------------------
backend nginx_ssl_backend
    mode tcp
    balance roundrobin
    option ssl-hello-chk
    server nginx1 127.0.0.1:443 check
EOF

echo -e "  ${GREEN}✓${NC} HAProxy configured"

#----------------------------------------------------------#
# Step 3: Restart services
#----------------------------------------------------------#
echo -e "${BLUE}[3/4] Restarting services...${NC}"

# Test nginx config
nginx -t 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗${NC} nginx config test failed"
    nginx -t
    exit 1
fi

# Test HAProxy config
haproxy -c -f /etc/haproxy/haproxy.cfg 2>/dev/null
if [ $? -ne 0 ]; then
    echo -e "  ${RED}✗${NC} HAProxy config test failed"
    haproxy -c -f /etc/haproxy/haproxy.cfg
    exit 1
fi

# Restart nginx first (release port 80)
systemctl restart nginx
sleep 2

# Start/restart HAProxy
systemctl enable haproxy
systemctl restart haproxy
sleep 2

echo -e "  ${GREEN}✓${NC} Services restarted"

#----------------------------------------------------------#
# Step 4: Verify
#----------------------------------------------------------#
echo -e "${BLUE}[4/4] Verifying configuration...${NC}"

# Check port 80
port80=$(ss -tulnp | grep ":80 " | head -1)
if echo "$port80" | grep -q "haproxy"; then
    echo -e "  ${GREEN}✓${NC} Port 80: HAProxy"
else
    echo -e "  ${YELLOW}⚠${NC} Port 80: $port80"
fi

# Check port 8080
port8080=$(ss -tulnp | grep ":8080 " | head -1)
if echo "$port8080" | grep -q "nginx"; then
    echo -e "  ${GREEN}✓${NC} Port 8080: nginx"
else
    echo -e "  ${YELLOW}⚠${NC} Port 8080: $port8080"
fi

# Check port 443
port443=$(ss -tulnp | grep ":443 " | head -1)
if echo "$port443" | grep -q "haproxy"; then
    echo -e "  ${GREEN}✓${NC} Port 443: HAProxy"
else
    echo -e "  ${YELLOW}⚠${NC} Port 443: $port443"
fi

# Check port 8404 (stats)
port8404=$(ss -tulnp | grep ":8404 " | head -1)
if echo "$port8404" | grep -q "haproxy"; then
    echo -e "  ${GREEN}✓${NC} Port 8404 (stats): HAProxy"
fi

echo ""
echo "=============================================="
echo -e "   ${GREEN}Configuration Complete!${NC}"
echo "=============================================="
echo ""
echo "HAProxy Stats: http://$SERVER_IP:8404/stats"
echo "  Username: admin"
echo "  Password: (check /etc/haproxy/haproxy.cfg)"
echo ""
echo "Port mapping:"
echo "  80  -> HAProxy -> 127.0.0.1:8080 (nginx)"
echo "  443 -> HAProxy -> 127.0.0.1:443 (nginx SSL)"
echo ""
