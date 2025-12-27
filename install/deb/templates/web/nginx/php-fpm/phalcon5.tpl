#=======================================================================#
# VHestiaCP - Phalcon 5.x Template (HTTP)                               #
# For Phalcon PHP Framework applications                                #
#=======================================================================#

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    
    root        %docroot%/public;
    index       index.php index.html index.htm;
    
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;
    
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    
    # Let's Encrypt
    location ~ /\.well-known\/acme-challenge/ {
        allow all;
        default_type "text/plain";
        root %docroot%;
    }
    
    # Hidden files
    location ~ /\.(?!well-known\/) {
        deny all;
        return 404;
    }
    
    # Static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|webp)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
        try_files $uri =404;
    }
    
    # Phalcon routing
    location / {
        try_files $uri $uri/ /index.php?_url=$uri&$args;
    }
    
    # PHP handling
    location ~ [^/]\.php(/|$) {
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        
        if (!-f $document_root$fastcgi_script_name) {
            return 404;
        }
        
        fastcgi_pass %backend_lsnr%;
        fastcgi_index index.php;
        
        include /etc/nginx/fastcgi_params;
        
        fastcgi_param APPLICATION_ENV production;
        
        fastcgi_connect_timeout 60s;
        fastcgi_send_timeout 60s;
        fastcgi_read_timeout 60s;
        
        fastcgi_buffer_size 128k;
        fastcgi_buffers 4 256k;
        fastcgi_busy_buffers_size 256k;
        
        include %home%/%user%/conf/web/%domain%/nginx.fastcgi_cache.conf*;
    }
    
    # Custom configuration
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
