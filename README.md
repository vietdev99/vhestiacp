# VHestiaCP

VHestiaCP is an extended fork of [HestiaCP](https://hestiacp.com) with additional features:

- **HAProxy** - Load balancer with SSL termination/passthrough
- **MongoDB** - NoSQL database with web management
- **Node.js** - Multi-version support with PM2 process manager
- **Python** - Multi-version support with Gunicorn/uWSGI

## Requirements

- Ubuntu 24.04 LTS (fresh install)
- Minimum 2GB RAM
- 20GB disk space

## Quick Install

```bash
# Download installer
wget https://raw.githubusercontent.com/your-repo/vhestiacp/main/install/vhst-install.sh

# Run with minimal options (auto-detect hostname)
sudo bash vhst-install.sh --email admin@example.com --interactive no

# Or with full options
sudo bash vhst-install.sh \
  --hostname server.example.com \
  --email admin@example.com \
  --haproxy yes \
  --mongodb yes \
  --mongodb-version 7.0 \
  --nodejs yes \
  --python yes \
  --interactive no
```

## New Features

### HAProxy Load Balancer
- SSL termination or passthrough mode
- Stats dashboard on port 8404
- Multiple backend support
- Admin panel integration

### MongoDB
- Version selection (4.4 - 7.0)
- Database management in web panel
- User management with role-based access

### Node.js
- Multi-version support via NVM
- PM2 process management
- Web panel integration

### Python
- Multi-version support via Pyenv
- Gunicorn integration
- Systemd service management

## Web Panel Navigation

New tabs:
- **MONGO** - MongoDB database management
- **NODE** - Node.js/PM2 applications
- **PYTHON** - Python/Gunicorn applications
- **HAProxy** button in Server > Services

## License

GPLv3 - Same as HestiaCP
