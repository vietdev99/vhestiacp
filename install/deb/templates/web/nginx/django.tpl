#=======================================================================#
# VHestiaCP - Django Template (HTTP)                                    #
# For Python/Django applications with Gunicorn                          #
#=======================================================================#

server {
    listen      %ip%:%web_port%;
    server_name %domain_idn% %alias_idn%;
    
    root        %docroot%;
    
    access_log  /var/log/nginx/domains/%domain%.log combined;
    access_log  /var/log/nginx/domains/%domain%.bytes bytes;
    error_log   /var/log/nginx/domains/%domain%.error.log error;
    
    include %home%/%user%/conf/web/%domain%/nginx.forcessl.conf*;
    
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
    
    # Django static files
    location /static/ {
        alias %home%/%user%/web/%domain%/pythonapp/staticfiles/;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
    
    # Django media files
    location /media/ {
        alias %home%/%user%/web/%domain%/pythonapp/media/;
        expires 7d;
        add_header Cache-Control "public";
    }
    
    # Proxy to Gunicorn
    location / {
        proxy_pass http://127.0.0.1:%backend_port%;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        proxy_redirect off;
        proxy_buffering off;
    }
    
    # Custom configuration
    include %home%/%user%/conf/web/%domain%/nginx.conf_*;
}
