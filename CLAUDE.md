# VHestiaCP - Claude Code Context

This document provides context for Claude Code when working on the VHestiaCP project.

## Project Overview

VHestiaCP is an extended fork of HestiaCP (Hestia Control Panel) with additional features for modern web hosting needs.

## Key Differences from HestiaCP

### 1. MongoDB Support

Full MongoDB database management:

- **Scripts**: `bin/v-add-sys-mongodb`, `bin/v-add-database-mongo`, `bin/v-list-database-mongo`, etc.
- **Web UI**: `web/templates/pages/list_mongodb.php`, `add_mongodb.php`, `edit_mongodb.php`
- **Server Config**: `web/templates/pages/edit_server_mongodb.php` - Advanced configuration with:
  - Cluster modes: Standalone, ReplicaSet, Sharding
  - Keyfile authentication management (generate/upload/download)
  - Percona Backup (PBM) integration with Logical/Physical/Incremental backup types
  - PITR (Point-in-Time Recovery) support
- **API**: `web/api/mongodb/keyfile.php` - Keyfile management API
- **Functions**: `func/mongodb.sh` - MongoDB helper functions

### 2. PM2 Process Manager

Node.js application management via PM2:

- **Web UI**: `web/templates/pages/list_pm2.php`
- **API**: `web/api/pm2/` - PM2 management APIs

### 3. HAProxy Load Balancer

- **Web UI**: `web/templates/pages/list_haproxy.php`
- **Scripts**: `bin/v-add-haproxy-backend`, etc.

### 4. Google Drive Backup (rclone)

- **Scripts**: `bin/v-add-backup-gdrive`
- **API**: `web/api/rclone/authorize.php` - OAuth token management

### 5. Custom Nginx Templates

Located in `install/deb/templates/web/nginx/php-fpm/`:

- `hosting.tpl` / `hosting.stpl` - Standard hosting with proxy support
- Templates support `proxy_ssl_server_name` for SNI

## Directory Structure

```
VHestiaCP/
├── bin/                    # CLI scripts (v-* commands)
├── func/                   # Shell function libraries
├── web/
│   ├── api/               # REST APIs
│   │   ├── mongodb/       # MongoDB management API
│   │   ├── pm2/           # PM2 management API
│   │   └── rclone/        # Backup/rclone API
│   ├── templates/
│   │   └── pages/         # PHP page templates
│   └── inc/               # PHP includes
├── install/
│   └── deb/
│       └── templates/     # System templates (nginx, apache, etc.)
└── docs/                  # Documentation
```

## Development Notes

### Git Commit Workflow

**IMPORTANT**: Sau mỗi lần hoàn thành một feature hoặc fix:

1. **Commit local ngay** - Để dễ revert nếu có lỗi phát sinh
2. **Luôn include CLAUDE.md** trong commit - Giúp AI đọc lại context khi pull về
3. **Commit message format**: Mô tả ngắn gọn những gì đã thay đổi

```bash
# Ví dụ commit sau khi hoàn thành feature
git add -A
git commit -m "Feature: Add Database submenu and Admin submenu to web_v2 sidebar"
```

**Lý do**:

- Nhiều tab/session có thể cùng sửa file, gây conflict
- Commit thường xuyên giúp rollback dễ dàng
- CLAUDE.md giúp AI hiểu context dự án khi tiếp tục làm việc

### Line Endings

When deploying from Windows to Linux, ensure all shell scripts use LF line endings (not CRLF):

```bash
find func bin -type f \( -name "*.sh" -o -name "v-*" \) -exec sed -i 's/\r$//' {} \;
```

### Deployment

Recommended deployment method (faster than scp):

```bash
# Create tar archive
tar -czvf /tmp/update.tar.gz web/ bin/ func/

# Transfer and extract
ssh root@server "cat > /tmp/update.tar.gz" < /tmp/update.tar.gz
ssh root@server "cd /usr/local/hestia && tar -xzvf /tmp/update.tar.gz"
```

### API Patterns

All web APIs follow this pattern:

```php
<?php
header("Content-Type: application/json");
include $_SERVER["DOCUMENT_ROOT"] . "/inc/main.php";

// Check admin
if ($_SESSION["userContext"] != "admin") {
    http_response_code(403);
    echo json_encode(["error" => "Access denied"]);
    exit();
}

// CSRF check
if (empty($_GET["token"]) || $_GET["token"] !== $_SESSION["token"]) {
    http_response_code(403);
    echo json_encode(["error" => "Invalid token"]);
    exit();
}

// Handle actions...
```

### JavaScript in Templates

UI interactions use vanilla JavaScript with fetch API:

```javascript
fetch('/api/mongodb/keyfile.php?action=generate&token=<?= $_SESSION["token"] ?>', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'path=' + encodeURIComponent(keyfilePath)
})
.then(r => r.json())
.then(data => { /* handle response */ });
```

## Testing Server

Development/testing server: `192.168.0.125`

## Related Documentation

- [MongoDB Configuration](docs/docs/server-administration/databases.md#mongodb-vhestiacp)
- [HestiaCP Documentation](https://docs.hestiacp.com/)
