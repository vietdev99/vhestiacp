# VHestiaCP Installation Guide

VHestiaCP là bản fork mở rộng của HestiaCP với các tính năng bổ sung.

## Yêu cầu hệ thống

- **OS**: Ubuntu 24.04 LTS (cài đặt mới, chưa có web server)
- **RAM**: Tối thiểu 2GB
- **Disk**: Tối thiểu 20GB

## Cách cài đặt

### Bước 1: Upload VHestiaCP lên server

```bash
# Upload file vhestiacp-full.zip lên server
# Có thể dùng: scp, sftp, hoặc FileZilla

# Giải nén
cd /root  # hoặc /home/viettel hoặc nơi bạn upload
unzip vhestiacp-full.zip
cd vhestiacp-full
```

### Bước 2: Chạy cài đặt

**Cách 1: Quick Start (khuyến nghị cho người mới)**

```bash
sudo bash quick-start.sh
```

Script sẽ hỏi email và các option, sau đó tự động cài.

---

**Cách 2: Lệnh trực tiếp**

```bash
cd install

# Cài đặt cơ bản (không có HAProxy, MongoDB, Node.js, Python)
sudo bash vhst-install.sh -e admin@example.com -f

# Cài đặt đầy đủ với tất cả tính năng
sudo bash vhst-install.sh \
    -e admin@example.com \
    --haproxy yes \
    --mongodb yes \
    --nodejs yes \
    --python yes \
    -f
```

### Bước 3: Đợi cài đặt (~15-30 phút)

Khi hoàn tất sẽ hiện:
```
====================================================================

Congratulations!

You have successfully installed VHestiaCP on your server.

    Admin URL:  https://your-ip:8083
    Username:   admin
    Password:   xxxxxxxx
```

## Các option cài đặt

| Option | Mô tả | Mặc định |
|--------|-------|----------|
| `-e, --email` | Admin email (bắt buộc) | - |
| `-s, --hostname` | Server hostname | Auto-detect |
| `-p, --password` | Admin password | Auto-generate |
| `-a, --apache` | Install Apache (nginx+apache) | yes |
| `-H, --haproxy` | Install HAProxy | no |
| `-O, --mongodb` | Install MongoDB | no |
| `--mongodb-version` | MongoDB version (4.4-7.0) | 7.0 |
| `-N, --nodejs` | Install Node.js + PM2 | no |
| `--nodejs-versions` | Node.js versions | 20 |
| `-P, --python` | Install Python + Gunicorn | no |
| `-f, --force` | Force install | no |

## Ví dụ cài đặt

```bash
# Chỉ nginx (không apache), không mail
sudo bash vhst-install.sh \
    -e admin@example.com \
    -a no \
    -x no -z no -c no -t no \
    -f

# Nginx only + HAProxy + MongoDB
sudo bash vhst-install.sh \
    -e admin@example.com \
    -a no \
    --haproxy yes \
    --mongodb yes \
    -f

# Full stack với tất cả features
sudo bash vhst-install.sh \
    -e admin@example.com \
    --haproxy yes \
    --mongodb yes \
    --mongodb-version 7.0 \
    --nodejs yes \
    --nodejs-versions "20,22" \
    --python yes \
    -f
```

## Sau khi cài đặt

### Web Panel

Truy cập: `https://your-server-ip:8083`

Các tab mới trong menu:
- **MONGO** - Quản lý MongoDB databases
- **NODE** - Quản lý Node.js/PM2 applications
- **PYTHON** - Quản lý Python/Gunicorn applications

### Kiểm tra services

```bash
# HAProxy
systemctl status haproxy
# Stats: http://your-ip:8404/stats

# MongoDB
systemctl status mongod

# Hestia
systemctl status hestia
```

### CLI Commands mới

```bash
# HAProxy
v-add-sys-haproxy           # Cài HAProxy
v-delete-sys-haproxy        # Gỡ HAProxy
v-list-sys-haproxy          # Xem status

# MongoDB
v-add-database-mongo user dbname    # Tạo database
v-list-database-mongo user          # List databases
v-delete-database-mongo user dbname # Xóa database

# Node.js
v-add-sys-nodejs 20 yes             # Cài Node.js v20
v-add-web-domain-nodejs user domain # Setup Node.js app
v-start-web-domain-nodejs user domain
v-stop-web-domain-nodejs user domain
v-restart-web-domain-nodejs user domain

# Python
v-add-web-domain-python user domain # Setup Python app
v-start-web-domain-python user domain
v-stop-web-domain-python user domain
```

## Troubleshooting

### Không thấy tab MONGO/NODE/PYTHON trong menu

Kiểm tra hestia.conf:
```bash
cat /usr/local/hestia/conf/hestia.conf | grep -E "MONGODB|NODEJS|PYTHON"
```

Nếu thiếu:
```bash
echo "MONGODB_SYSTEM='yes'" >> /usr/local/hestia/conf/hestia.conf
echo "NODEJS_SYSTEM='yes'" >> /usr/local/hestia/conf/hestia.conf
echo "PYTHON_SYSTEM='yes'" >> /usr/local/hestia/conf/hestia.conf
systemctl restart hestia
```

### Lỗi Apache khi chọn nginx only

Đã được fix trong bản này. Script sẽ chỉ check Apache nếu nó thực sự được cài và enable.

### Lỗi locale warning

Script tự động fix locale khi bắt đầu cài đặt.

## Cấu trúc thư mục

```
vhestiacp-full/
├── bin/                     # CLI scripts (v-add-sys-*, v-list-*, ...)
├── func/                    # Shared functions
├── install/
│   ├── vhst-install.sh      # Main installer (wrapper)
│   ├── hst-install-ubuntu.sh # HestiaCP installer (modified)
│   ├── deb/templates/       # nginx templates
│   └── web/install.html     # Web-based command generator
├── web/                     # Web panel files
│   ├── list/{mongodb,nodejs,python,haproxy}/
│   ├── templates/pages/
│   └── templates/includes/panel.php  # Modified navigation
├── quick-start.sh           # Interactive quick installer
├── INSTALL.md               # This file
└── README.md
```
