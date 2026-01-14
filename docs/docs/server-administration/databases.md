# Database & phpMyAdmin SSO

## How to setup a remote database server

1. It is assumed you already have your second server up and running.
2. On your Hestia server run the following command (`mysql` may be replaced by `postgresql`):

```bash
v-add-database-host mysql new-server.com root password
```

To make sure the host has been added, run the following command:

```bash
v-list-database-hosts
```

## Why I can’t use `http://ip/phpmyadmin/`

For security reasons, we have decided to disable this option. Please use `https://host.domain.tld/phpmyadmin/` instead.

## How to create PhpMyAdmin root user credentials

Replace `myrootusername` & `myrootusername_password` with preferred credentials:

```bash
mysql -uroot
```

```sql
CREATE USER 'myrootusername'@'localhost' IDENTIFIED BY 'myrootusername_password';
GRANT ALL PRIVILEGES ON *.* TO 'myrootusername'@'localhost' WITH GRANT OPTION;
FLUSH PRIVILEGES;
QUIT;
```

## How can I enable access to `http://ip/phpmyadmin/`

### For Apache2

```bash
nano /etc/apache2/conf.d/ip.conf

# Add the following code before both </VirtualHost> closing tags
IncludeOptional /etc/apache2/conf.d/*.inc

# Restart apache2
systemctl restart apache2

# You can also add the following in /etc/apache2.conf instead
IncludeOptional /etc/apache2/conf.d/*.inc
```

### For Nginx

```bash
nano /etc/nginx/conf.d/ip.conf

# Replace the following
location /phpmyadmin/ {
  alias /var/www/document_errors/;
  return 404;
}
location /phppgadmin/ {
  alias /var/www/document_errors/;
  return 404;
}

# With the following
include     /etc/nginx/conf.d/phpmyadmin.inc*;
include     /etc/nginx/conf.d/phppgadmin.inc*;
```

## How can I connect from a remote location to the database

By default, connections to port 3306 are disabled in the firewall. Open
port 3306 in the firewall ([documentation](./firewall)), then edit `/etc/mysql/mariadb.conf.d/50-server.cnf`:

```bash
nano /etc/mysql/mariadb.conf.d/50-server.cnf

# Set bind-address to one of the following
bind-address = 0.0.0.0
bind-address = "your.server.ip.address"
```

## PhpMyAdmin Single Sign On

NOTE: PhpMyAdmin Single Sign On enabled only for individual databases. Primary "PhpMyAdmin" button for existing database credentials only.

### Unable to activate phpMyAdmin Single Sign on

Make sure the API is enabled and working properly. Hestia’s PhpMyAdmin Single Sign On function connects over the Hestia API.

### When clicking the phpMyAdmin Single Sign On button, I am forwarded to the login page of phpMyAdmin

Automated can sometimes cause issues. Login via SSH and open `/var/log/{webserver}/domains/{hostname.domain.tld.error.log` and look for one of the following error messages:

- `Unable to connect over API, please check API connection`
  1. Check if the api has been enabled.
  2. Add the public IP of your server to the allowed IPs in the **Server settings**.
- `Access denied: There is a security token mismatch`
  1. Disable and then enable the phpMyAdmin SSO. This will refresh both keys.
  2. If you are behind a firewall or proxy, you may want to disable it and try again.
- `Link has expired`
  1. Refresh the database page and try again.

## Remote databases

If needed you can simply host Mysql or Postgresql on a remote server.

To add a remote database:

```bash
v-add-database-host TYPE HOST DBUSER DBPASS [MAX_DB] [CHARSETS] [TPL] [PORT]
```

For example:

```bash
v-add-database-host mysql db.hestiacp.com root mypassword 500
```

If you want you can setup phpMyAdmin on the host server to allow to connect to the database. Create a copy of `01-localhost` file in `/etc/phpmyadmin/conf.d` and change:

```php
$cfg["Servers"][$i]["host"] = "localhost";
$cfg["Servers"][$i]["port"] = "3306";
$cfg["Servers"][$i]["pmadb"] = "phpmyadmin";
$cfg["Servers"][$i]["controluser"] = "pma";
$cfg["Servers"][$i]["controlpass"] = "random password";
$cfg["Servers"][$i]["bookmarktable"] = "pma__bookmark";
```

Please make sure to create aswell the phpmyadmin user and database.

See `/usr/local/hestia/install/deb/phpmyadmin/pma.sh`

## MongoDB (VHestiaCP)

VHestiaCP adds full MongoDB support including database management, user authentication, and cluster configuration.

### Installing MongoDB

```bash
v-add-sys-mongodb [VERSION]
```

Supported versions: 6.0, 7.0, 8.0

### MongoDB Commands

| Command                            | Description                    |
| ---------------------------------- | ------------------------------ |
| `v-add-sys-mongodb`                | Install MongoDB server         |
| `v-delete-sys-mongodb`             | Remove MongoDB server          |
| `v-add-database-mongo`             | Create MongoDB database        |
| `v-delete-database-mongo`          | Delete MongoDB database        |
| `v-list-database-mongo`            | List MongoDB databases         |
| `v-change-database-mongo-password` | Change database user password  |

### Creating a MongoDB Database

```bash
v-add-database-mongo admin mydb myuser mypassword
```

### MongoDB Server Configuration

Access MongoDB configuration via **Server** → **Services** → click **mongodb** → **Configure**.

Features include:

- **Cluster Mode**: Standalone, ReplicaSet, or Sharding
- **Keyfile Authentication**: Generate, upload, or download keyfile for cluster authentication
- **Percona Backup (PBM)**: Full backup solution with multiple options

### Percona Backup for MongoDB (PBM)

When using ReplicaSet mode, you can enable Percona Backup with:

| Backup Type            | Description                                                                        |
| ---------------------- | ---------------------------------------------------------------------------------- |
| **Logical**            | Uses mongodump. Slower but compatible across MongoDB versions. Good for migration. |
| **Physical**           | File-level copy. Faster but requires same MongoDB version for restore.             |
| **Incremental + PITR** | Continuous oplog capture for point-in-time recovery to any second.                 |

Backup storage options:

- **Local Filesystem**: Store backups on the server
- **Amazon S3 / Compatible**: Store backups in S3, MinIO, etc.

### Keyfile Authentication for Clusters

MongoDB ReplicaSet and Sharding clusters require a keyfile for internal authentication between nodes.

From the MongoDB configuration page:

1. **Generate Key**: Creates a new 756-byte random keyfile
2. **Upload Key**: Upload existing keyfile from another node
3. **Download Key**: Download keyfile to copy to other cluster nodes

The keyfile path defaults to `/var/lib/mongodb/keyfile` with proper permissions (400) and ownership (mongodb:mongodb)
