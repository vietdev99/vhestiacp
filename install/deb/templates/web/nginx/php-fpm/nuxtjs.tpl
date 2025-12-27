#=======================================================================#
# VHestiaCP - Nuxt.js SSR Template (HTTP)                               #
# For Server-Side Rendering with Node.js backend                        #
#=======================================================================#

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    
    root        %docroot%;
    
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;
    
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/json image/svg+xml;
    
    location ~ /\.well-known\/acme-challenge/ {
        allow all;
        default_type "text/plain";
    }
    
    location ~ /\.(?!well-known\/) {
        deny all;
        return 404;
    }
    
    # Nuxt.js static files
    location /_next/static/ {
        alias %home%/%user%/web/%domain%/nodeapp/.nuxt/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Public static files
    location /static/ {
        alias %docroot%/static/;
        expires 30d;
        add_header Cache-Control "public";
    }
    
    # Proxy to Nuxt.js application
    location / {
        proxy_pass http://127.0.0.1:%backend_port%;
        proxy_http_version 1.1;
        
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_buffering off;
    }
    
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
