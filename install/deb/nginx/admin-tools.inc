# VHestiaCP - Admin Tools Nginx Configuration
# This config handles phpMyAdmin, Roundcube, etc. when accessed via IP
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
