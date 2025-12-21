#=======================================================================#
# VHestiaCP - ReactJS SPA Template (HTTP)                               #
# For single-page applications with HTML5 History API routing           #
#=======================================================================#

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    
    root        %docroot%;
    index       index.html;
    
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;
    
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    
    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    gzip_disable "MSIE [1-6]\.";
    
    # Let's Encrypt
    location ~ /\.well-known\/acme-challenge/ {
        allow all;
        default_type "text/plain";
    }
    
    # Hidden files
    location ~ /\.(?!well-known\/) {
        deny all;
        return 404;
    }
    
    # Static assets with caching
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp|avif)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    # Service worker - no caching
    location = /service-worker.js {
        expires off;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
    }
    
    # API proxy (if needed, configure backend_port)
    location /api/ {
        # Uncomment to proxy API requests to a backend
        # proxy_pass http://127.0.0.1:%backend_port%;
        # proxy_http_version 1.1;
        # proxy_set_header Host $host;
        # proxy_set_header X-Real-IP $remote_addr;
        # proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        # proxy_set_header X-Forwarded-Proto $scheme;
        
        return 404;
    }
    
    # SPA fallback - all routes to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Custom configuration
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
