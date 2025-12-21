# VHestiaCP - Admin Tools Nginx Configuration
# This config handles phpMyAdmin, Mongo Express, etc. when accessed via IP
# Location: /etc/nginx/conf.d/vhestia-admin-tools.conf

# phpMyAdmin configuration
location /phpmyadmin {
    alias /usr/share/phpmyadmin;
    index index.php index.html;
    
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        include fastcgi_params;
    }
    
    location ~* \.(js|css|png|jpg|jpeg|gif|ico)$ {
        expires max;
        log_not_found off;
    }
}

# phpMyAdmin aliases (case variations)
location /phpMyAdmin { return 301 /phpmyadmin$request_uri; }
location /pma { return 301 /phpmyadmin$request_uri; }
location /PMA { return 301 /phpmyadmin$request_uri; }

# Mongo Express configuration
location /mongo-express {
    proxy_pass http://127.0.0.1:8081;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
}

# Mongo Express aliases
location /mongoexpress { return 301 /mongo-express$request_uri; }
location /mongoadmin { return 301 /mongo-express$request_uri; }

# Roundcube webmail
location /webmail {
    alias /var/lib/roundcube;
    index index.php;
    
    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php-fpm.sock;
        fastcgi_index index.php;
        fastcgi_param SCRIPT_FILENAME $request_filename;
        include fastcgi_params;
    }
}

location /roundcube { return 301 /webmail$request_uri; }
location /mail { return 301 /webmail$request_uri; }
