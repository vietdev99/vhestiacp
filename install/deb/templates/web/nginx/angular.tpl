#=======================================================================#
# VHestiaCP - Vue.js SPA Template (HTTP)                                #
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
    
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied expired no-cache no-store private auth;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml application/javascript application/json;
    
    location ~ /\.well-known\/acme-challenge/ {
        allow all;
        default_type "text/plain";
    }
    
    location ~ /\.(?!well-known\/) {
        deny all;
        return 404;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
