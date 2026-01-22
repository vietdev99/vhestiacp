#!/bin/bash
#===========================================================================#
#                                                                           #
#          VHestiaCP Uninstall Script                                       #
#          Removes VHestiaCP and all related services                       #
#                                                                           #
#===========================================================================#

# Check if running as root
if [ "$(id -u)" != "0" ]; then
    echo "Error: This script must be run as root"
    exit 1
fi

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           VHestiaCP Uninstall Script                          ║"
echo "║   This will remove VHestiaCP and all related services         ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""

# Confirm uninstall
if [ "$1" != "-f" ] && [ "$1" != "--force" ]; then
    read -p "Are you sure you want to uninstall VHestiaCP? (y/N): " confirm
    if [ "$confirm" != "y" ] && [ "$confirm" != "Y" ]; then
        echo "Uninstall cancelled."
        exit 0
    fi
fi

echo ""
echo "[ * ] Stopping services..."

# Stop PM2
pm2 stop all 2>/dev/null || true
pm2 delete all 2>/dev/null || true
pm2 kill 2>/dev/null || true

# Stop VHestiaCP services
systemctl stop hestia 2>/dev/null || true
systemctl stop vhestia 2>/dev/null || true

# Stop web services
systemctl stop nginx 2>/dev/null || true
systemctl stop apache2 2>/dev/null || true
systemctl stop haproxy 2>/dev/null || true

# Stop database services
systemctl stop mariadb 2>/dev/null || true
systemctl stop mysql 2>/dev/null || true
systemctl stop mongod 2>/dev/null || true
systemctl stop postgresql 2>/dev/null || true

# Stop mail services
systemctl stop exim4 2>/dev/null || true
systemctl stop dovecot 2>/dev/null || true
systemctl stop clamav-daemon 2>/dev/null || true
systemctl stop spamassassin 2>/dev/null || true
systemctl stop spamd 2>/dev/null || true

# Stop other services
systemctl stop bind9 2>/dev/null || true
systemctl stop named 2>/dev/null || true
systemctl stop vsftpd 2>/dev/null || true
systemctl stop proftpd 2>/dev/null || true
systemctl stop fail2ban 2>/dev/null || true

echo "[ * ] Removing packages..."

# Remove VHestiaCP package
apt-get -y purge vhestia hestia hestia-nginx hestia-php 2>/dev/null || true

# Remove web servers
apt-get -y purge nginx* apache2* haproxy 2>/dev/null || true

# Remove databases
apt-get -y purge mariadb-server* mysql-server* mongodb-org* postgresql* 2>/dev/null || true

# Remove mail servers
apt-get -y purge exim4* dovecot* clamav* spamassassin* 2>/dev/null || true

# Remove DNS
apt-get -y purge bind9* 2>/dev/null || true

# Remove FTP
apt-get -y purge vsftpd proftpd* 2>/dev/null || true

# Remove PHP
apt-get -y purge php* 2>/dev/null || true

# Remove fail2ban
apt-get -y purge fail2ban 2>/dev/null || true

# Clean up
apt-get -y autoremove 2>/dev/null || true
apt-get -y autoclean 2>/dev/null || true

echo "[ * ] Removing VHestiaCP directories..."

# Remove VHestiaCP directories
rm -rf /usr/local/vhestia 2>/dev/null || true
rm -rf /usr/local/hestia 2>/dev/null || true
rm -rf /etc/vhestia 2>/dev/null || true
rm -rf /etc/hestiacp 2>/dev/null || true

# Remove config directories
rm -rf /etc/nginx 2>/dev/null || true
rm -rf /etc/apache2 2>/dev/null || true
rm -rf /etc/haproxy 2>/dev/null || true
rm -rf /etc/exim4 2>/dev/null || true
rm -rf /etc/dovecot 2>/dev/null || true
rm -rf /etc/bind 2>/dev/null || true
rm -rf /etc/fail2ban 2>/dev/null || true

# Remove data directories
rm -rf /var/log/hestia 2>/dev/null || true
rm -rf /var/log/vhestia 2>/dev/null || true

# Remove database directories
rm -rf /var/lib/mysql 2>/dev/null || true
rm -rf /var/lib/mongodb 2>/dev/null || true
rm -rf /var/lib/postgresql 2>/dev/null || true

# Remove admin user home directory
rm -rf /home/admin 2>/dev/null || true
userdel -r admin 2>/dev/null || true

# Remove apt sources
rm -f /etc/apt/sources.list.d/hestia*.list 2>/dev/null || true
rm -f /etc/apt/sources.list.d/nginx*.list 2>/dev/null || true
rm -f /etc/apt/sources.list.d/mariadb*.list 2>/dev/null || true
rm -f /etc/apt/sources.list.d/mongodb*.list 2>/dev/null || true
rm -f /etc/apt/sources.list.d/ondrej*.list 2>/dev/null || true
rm -f /etc/apt/sources.list.d/php*.list 2>/dev/null || true

# Remove keyrings
rm -f /usr/share/keyrings/hestia*.gpg 2>/dev/null || true
rm -f /usr/share/keyrings/nginx*.gpg 2>/dev/null || true
rm -f /usr/share/keyrings/mariadb*.gpg 2>/dev/null || true
rm -f /usr/share/keyrings/mongodb*.gpg 2>/dev/null || true

# Remove profile.d
rm -f /etc/profile.d/hestia.sh 2>/dev/null || true
rm -f /etc/profile.d/vhestia.sh 2>/dev/null || true

# Remove users
userdel -r hestiaweb 2>/dev/null || true
userdel -r hestiamail 2>/dev/null || true
groupdel hestia-users 2>/dev/null || true

# Remove cron jobs
rm -f /etc/cron.d/hestia* 2>/dev/null || true
rm -f /var/spool/cron/crontabs/hestiaweb 2>/dev/null || true

# Update apt
apt-get update 2>/dev/null || true

echo ""
echo "╔═══════════════════════════════════════════════════════════════╗"
echo "║           VHestiaCP Uninstall Complete!                       ║"
echo "╚═══════════════════════════════════════════════════════════════╝"
echo ""
echo "All VHestiaCP services and packages have been removed."
echo "You may want to reboot your server to ensure a clean state."
echo ""
