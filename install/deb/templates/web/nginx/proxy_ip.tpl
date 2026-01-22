server {
	listen 0.0.0.0:%proxy_port% default_server;
	server_name _;
	access_log off;
	error_log /dev/null;

	location / {
		proxy_pass http://127.0.0.1:%web_port%;
   }
}

server {
	listen 0.0.0.0:%proxy_ssl_port% default_server ssl;
	server_name _;
	access_log off;
	error_log /dev/null;

	ssl_certificate     /usr/local/vhestia/ssl/certificate.crt;
	ssl_certificate_key /usr/local/vhestia/ssl/certificate.key;

	return 301 http://$host$request_uri;

	location / {
		root /var/www/document_errors/;
	}

	location /error/ {
		alias /var/www/document_errors/;
	}
}
