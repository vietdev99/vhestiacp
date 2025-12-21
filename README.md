# VHestiaCP

[![GitHub](https://img.shields.io/badge/GitHub-vietdev99%2Fvhestiacp-blue?logo=github)](https://github.com/vietdev99/vhestiacp)
[![Ubuntu](https://img.shields.io/badge/Ubuntu-24.04%20LTS-orange?logo=ubuntu)](https://ubuntu.com/)
[![License](https://img.shields.io/badge/License-GPLv3-green)](LICENSE)

VHestiaCP is an extended fork of [HestiaCP](https://hestiacp.com) with modern infrastructure components for full-stack application hosting.

## ✨ Extended Features

| Feature | Description |
|---------|-------------|
| **HAProxy** | Load balancer with SSL termination, stats dashboard, frontend/backend management |
| **MongoDB** | NoSQL database (v7.0/8.0) with web panel management |
| **Node.js** | Multi-version support (NVM) with PM2 process manager |
| **Python** | Multi-version support (Pyenv) with Gunicorn WSGI server |
| **RabbitMQ** | Message broker with Management UI |
| **Apache Kafka** | Streaming platform with Kafka UI |
| **Redis** | In-memory cache with config editor |

## 📋 Requirements

- **OS:** Ubuntu 24.04 LTS (fresh install only)
- **RAM:** Minimum 2GB (4GB+ recommended)
- **Disk:** 20GB+ free space
- **Access:** Root SSH access

## 🚀 Installation

### Option 1: Interactive Installer (Recommended)

Generate your custom installation command at:

### 👉 **[https://vietdev99.github.io/vhestiacp/](https://vietdev99.github.io/vhestiacp/)**

Select your options and copy the generated command.

---

### Option 2: Manual Installation

```bash
# Clone repository
git clone https://github.com/vietdev99/vhestiacp.git
cd vhestiacp/install

# Run installer with options
bash hst-install-ubuntu.sh \
  -e admin@example.com \
  --haproxy yes \
  --mongodb yes \
  --nodejs yes \
  --python yes \
  --rabbitmq yes \
  --kafka yes \
  --redis yes \
  -f
```

### Installation Options

| Option | Description | Default |
|--------|-------------|---------|
| `-e, --email` | Admin email | required |
| `-s, --hostname` | Server hostname | auto-detect |
| `-p, --password` | Admin password | auto-generate |
| `--haproxy` | Install HAProxy | no |
| `--haproxy-stats` | Enable stats dashboard | yes |
| `--mongodb` | Install MongoDB | no |
| `--mongodb-version` | MongoDB version (7.0/8.0) | 8.0 |
| `--nodejs` | Install Node.js/PM2 | no |
| `--nodejs-versions` | Node versions (18,20,22) | 20 |
| `--python` | Install Python/Gunicorn | no |
| `--rabbitmq` | Install RabbitMQ | no |
| `--rabbitmq-management` | RabbitMQ Management UI | yes |
| `--kafka` | Install Apache Kafka | no |
| `--kafka-ui` | Kafka Web UI | yes |
| `--redis` | Install Redis cache | no |
| `-f, --force` | Non-interactive mode | no |

## 🖥️ Web Panel

### New Navigation Tabs

| Tab | Features |
|-----|----------|
| **MONGO** | Create databases, manage users, view connection strings |
| **NODE** | PM2 apps, multi-version Node.js, process management |
| **PYTHON** | Gunicorn apps, virtual environments, multi-version Python |
| **HAProxy** | Frontends, backends, listen blocks, config editor |

### Server → Services

All VHestiaCP services appear in the services list:
- HAProxy
- MongoDB  
- RabbitMQ
- Kafka
- Redis

### Server → Configure → VHestiaCP Extensions

View and manage:
- Service status and credentials
- Configuration editors
- Quick links to management UIs

## 🔐 Service Credentials

After installation, credentials are stored in:

| Service | Config File |
|---------|-------------|
| MongoDB | `/usr/local/hestia/conf/mongodb.conf` |
| RabbitMQ | `/usr/local/hestia/conf/rabbitmq.conf` |
| Kafka | `/usr/local/hestia/conf/kafka.conf` |
| Redis | `/usr/local/hestia/conf/redis.conf` |

Access via Admin Panel: **Server → Configure → VHestiaCP Extensions**

## 🔗 Default Ports

| Service | Port | Description |
|---------|------|-------------|
| HAProxy Stats | 8404 | Statistics dashboard |
| MongoDB | 27017 | Database connection |
| RabbitMQ AMQP | 5672 | Message broker |
| RabbitMQ Management | 15672 | Web UI |
| Kafka Broker | 9092 | Streaming |
| Kafka UI | 8090 | Web UI |
| Redis | 6379 | Cache |

## 📖 Documentation

- [HestiaCP Documentation](https://hestiacp.com/docs/)
- [VHestiaCP Installer](https://vietdev99.github.io/vhestiacp/)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

GPLv3 - Same as HestiaCP

---

**VHestiaCP** - Modern hosting control panel for full-stack applications
