# VHestiaCP Docker Helper Commands

## 📺 Monitor Installation

### Realtime log monitoring:
```bash
wsl docker exec vhestiacp-test tail -f /var/log/vhestia-install.log
```

### Check last 100 lines:
```bash
wsl docker exec vhestiacp-test tail -100 /var/log/vhestia-install.log
```

### Check if installation is running:
```bash
wsl docker exec vhestiacp-test ps aux | grep hst-install
```

### Check installation progress (key steps):
```bash
wsl docker exec vhestiacp-test bash -c "grep -E '\[ \* \]|\[ ✓ \]|Installing|Configuring' /var/log/vhestia-install.log | tail -20"
```

---

## 🔄 Container Management

### Stop container:
```bash
wsl docker stop vhestiacp-test
```

### Start container:
```bash
wsl docker start vhestiacp-test
```

### Restart container:
```bash
wsl docker restart vhestiacp-test
```

### Remove container:
```bash
wsl docker rm -f vhestiacp-test
```

### Access container shell:
```bash
wsl docker exec -it vhestiacp-test bash
```

---

## 💾 Snapshot Management

### List snapshots:
```bash
wsl docker images | grep vhestiacp-base
```

### Current snapshot:
- **vhestiacp-base:deps-ready** - OS + dependencies installed, ready for VHestiaCP install

### Restore from snapshot:
```bash
# 1. Remove current container
wsl docker rm -f vhestiacp-test

# 2. Create new from snapshot
wsl docker run -d --name vhestiacp-test --privileged --hostname erp.printway.io \
  -p 8083:8083 -p 8080:80 -p 8443:443 -p 8404:8404 \
  vhestiacp-base:deps-ready sleep infinity

# 3. Copy new installer
wsl docker cp install/hst-install-ubuntu.sh vhestiacp-test:/root/

# 4. Run installation
wsl docker exec vhestiacp-test bash -c "cd /root && bash hst-install-ubuntu.sh -s erp.printway.io -e tuanlv@printway.io -a yes -w yes --haproxy yes --haproxy-stats yes --haproxy-ssl-mode passthrough --nodejs yes --nodejs-versions '20,22' --python yes --mongodb yes --mongodb-version 7.0 --rabbitmq yes --rabbitmq-management yes --kafka yes --kafka-ui yes --redis yes -m yes -g no -k yes -x yes -z yes -Z yes -c yes -t yes -i yes -b yes -v no -q yes -d no -y no -f > /var/log/vhestia-install.log 2>&1 &"
```

### Create new snapshot after install:
```bash
wsl docker commit vhestiacp-test vhestiacp-base:installed
```

---

## 🌐 Access URLs

**After installation completes:**

- **Control Panel:** http://localhost:8083
- **Website HTTP:** http://localhost:8080
- **Website HTTPS:** https://localhost:8443
- **HAProxy Stats:** http://localhost:8404/stats

**Default Credentials:**
- Username: `admin`
- Password: Check installation log or `/usr/local/hestia/data/users/admin/user.conf`

---

## 🔍 Check Services Status

### All services:
```bash
wsl docker exec vhestiacp-test systemctl list-units --type=service --state=running
```

### Specific services:
```bash
# Nginx
wsl docker exec vhestiacp-test systemctl status nginx

# HAProxy
wsl docker exec vhestiacp-test systemctl status haproxy

# MongoDB
wsl docker exec vhestiacp-test systemctl status mongod

# MySQL/MariaDB
wsl docker exec vhestiacp-test systemctl status mysql

# Redis
wsl docker exec vhestiacp-test systemctl status redis

# RabbitMQ
wsl docker exec vhestiacp-test systemctl status rabbitmq-server

# Kafka
wsl docker exec vhestiacp-test systemctl status kafka
```

### Check ports:
```bash
wsl docker exec vhestiacp-test ss -tlnp
```

---

## 📋 Get Installation Credentials

### Admin password:
```bash
wsl docker exec vhestiacp-test bash -c "grep PASS /var/log/vhestia-install.log | tail -5"
```

### HAProxy stats credentials:
```bash
wsl docker exec vhestiacp-test bash -c "grep -E 'HAPROXY_STATS_' /usr/local/hestia/conf/hestia.conf"
```

### MongoDB credentials:
```bash
wsl docker exec vhestiacp-test cat /usr/local/hestia/conf/mongodb.conf
```

### RabbitMQ credentials:
```bash
wsl docker exec vhestiacp-test cat /usr/local/hestia/conf/rabbitmq.conf
```

---

## 🐛 Debug Issues

### Check installation errors:
```bash
wsl docker exec vhestiacp-test bash -c "grep -i error /var/log/vhestia-install.log | tail -20"
```

### Check nginx errors:
```bash
wsl docker exec vhestiacp-test tail -50 /var/log/nginx/error.log
```

### Check system logs:
```bash
wsl docker exec vhestiacp-test journalctl -xe --no-pager | tail -50
```

### Test port connectivity:
```bash
# From Windows
curl http://localhost:8080
curl http://localhost:8083
curl http://localhost:8404/stats
```
