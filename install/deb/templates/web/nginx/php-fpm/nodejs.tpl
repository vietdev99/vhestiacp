#=======================================================================#
# VHestiaCP - Node.js Template (HTTP)                                   #
# DO NOT MODIFY - Changes will be lost when rebuilding domains          #
#=======================================================================#

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    
    root        %docroot%;
    index       index.html index.htm;
    
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;
    
    # Force SSL redirect (optional)
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    
    # Let's Encrypt challenge
    location ~ /\.well-known\/acme-challenge/ {
        allow all;
        default_type "text/plain";
    }
    
    # Hidden files
    location ~ /\.(?!well-known\/) {
        deny all;
        return 404;
    }
    
    # Static files (served directly)
    location /static/ {
        alias %docroot%/static/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    location /public/ {
        alias %docroot%/public/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://127.0.0.1:%backend_port%;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Port $server_port;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Buffering
        proxy_buffering off;
        proxy_buffer_size 4k;
        proxy_buffers 4 32k;
        proxy_busy_buffers_size 64k;
    }
    
    # Custom configuration
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
