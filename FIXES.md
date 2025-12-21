# VHestiaCP - Confirmed Fixes Log

## Phiên bản: 2025-12-21

### ✅ MongoDB Fixes (CONFIRMED WORKING)

#### 1. v-list-database-mongo
**File:** `bin/v-list-database-mongo`
**Vấn đề:** JSON duplicate, mongosh output "switched to db admin"
**Fix:** 
- Dùng `db.getSiblingDB('admin')` thay vì `use admin`
- Dùng `sort -u` để loại bỏ duplicate
- Redirect stderr để bỏ warnings

#### 2. web/list/mongodb/index.php
**File:** `web/list/mongodb/index.php`
**Vấn đề:** `$user` variable trống
**Fix:**
- Lấy user từ `$_SESSION['user']` hoặc `$_SESSION['userContext']`

#### 3. setup_mongodb_auth()
**File:** `func/mongodb.sh`
**Vấn đề:** mongosh output "switched to db admin" làm hỏng verification
**Fix:**
- Tạo JavaScript file tạm để tạo user
- Dùng `db.getSiblingDB()` thay vì `use`

#### 4. Permissions
**Vấn đề:** PHP không đọc được hestia.conf, mongodb.conf
**Fix:**
```bash
chmod 755 /usr/local/hestia
chmod 755 /usr/local/hestia/conf
chmod 644 /usr/local/hestia/conf/*.conf
mkdir -p /home/admin/.mongodb
chown admin:admin /home/admin/.mongodb
```

### ✅ HAProxy Fixes (NEED CONFIRMATION)

#### 1. Port Configuration
**Vấn đề:** nginx chiếm port 80, HAProxy không thể bind
**Fix:**
- nginx listen 127.0.0.1:8080 (backend)
- HAProxy listen *:80, *:443 (frontend)
- HAProxy forward tới nginx

---

## Update Commands

Sau khi download package mới, chạy:

```bash
cd ~/vhestiacp-full
sudo bash apply-fixes.sh
```
