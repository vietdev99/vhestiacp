# VHestiaCP Confirmed Fixes
> Last updated: 2025-12-21 (v2)

## CRITICAL: These fixes are now INLINE in install script

### MongoDB Fixes
| Issue | Fix | Location |
|-------|-----|----------|
| $user empty | Get from $_SESSION['user'] | **INLINE in hst-install-ubuntu.sh** |
| JSON duplicates | filter "Warning", "switched", sort -u | **INLINE in hst-install-ubuntu.sh** |

### HAProxy Fixes  
| Issue | Fix | Location |
|-------|-----|----------|
| nginx keeps port 80 | perl regex + sed fallback | **INLINE in hst-install-ubuntu.sh** |
| No frontend/backend | Create full config inline | **INLINE in hst-install-ubuntu.sh** |
| HAProxy stops | Stop nginx first, change ports | **INLINE in hst-install-ubuntu.sh** |

## Install Script Changes (hst-install-ubuntu.sh)

### HAProxy Section (line ~2930)
Now includes:
1. Install HAProxy package
2. Change hestia.conf WEB_PORT to 8080
3. Update ALL nginx configs with perl regex
4. Force sed fallback for remaining
5. Stop nginx, kill port 80, restart nginx
6. Create full HAProxy config with:
   - Stats on :8404
   - http_front on :80 -> nginx_backend :8080
   - https_front on :443 -> nginx_ssl_backend :8443
7. Start HAProxy
8. Update hestia.conf with stats credentials

### MongoDB Web Fix Section (line ~2920)
Now includes:
1. Inline creation of web/list/mongodb/index.php with $user fix
2. Inline creation of bin/v-list-database-mongo with all filters

## Verification After Install

```bash
# Check HAProxy
sudo ss -tulnp | grep -E ":80|:8080|:443|:8404"
# Expected:
# :80    -> haproxy
# :443   -> haproxy  
# :8080  -> nginx
# :8443  -> nginx
# :8404  -> haproxy (stats)

# Check MongoDB list
sudo /usr/local/hestia/bin/v-list-database-mongo admin json
# Expected: {"admin_testdb":{...}}

# Check MongoDB web file has fix
grep "SESSION\['user" /usr/local/hestia/web/list/mongodb/index.php
# Expected: $user = $_SESSION['user'] ?? '';
```
