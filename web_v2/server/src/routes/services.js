import { Router } from 'express';
import fs from 'fs';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();

// Available services configuration
const AVAILABLE_SERVICES = {
  // Web Stack
  haproxy: {
    name: 'HAProxy',
    description: 'Load Balancer & Reverse Proxy',
    category: 'web',
    addCmd: 'v-add-sys-haproxy',
    deleteCmd: 'v-delete-sys-haproxy'
  },
  nginx: {
    name: 'Nginx',
    description: 'High Performance Web Server',
    category: 'web',
    addCmd: null, // Core service, cannot be added/removed easily
    deleteCmd: null
  },
  apache2: {
    name: 'Apache',
    description: 'Classic Web Server',
    category: 'web',
    addCmd: null,
    deleteCmd: null
  },
  phpfpm: {
    name: 'PHP-FPM',
    description: 'PHP FastCGI Process Manager',
    category: 'web',
    addCmd: 'v-add-sys-phpfpm',
    deleteCmd: null
  },
  // Databases
  mysql: {
    name: 'MariaDB/MySQL',
    description: 'Relational Database',
    category: 'database',
    addCmd: 'v-add-sys-mysql',
    deleteCmd: null
  },
  postgresql: {
    name: 'PostgreSQL',
    description: 'Advanced SQL Database',
    category: 'database',
    addCmd: 'v-add-sys-pgsql',
    deleteCmd: null
  },
  mongodb: {
    name: 'MongoDB',
    description: 'NoSQL Document Database',
    category: 'database',
    addCmd: 'v-add-sys-mongodb',
    deleteCmd: null
  },
  // PBM is shown in dedicated 'Database Backup Tools' section
  redis: {
    name: 'Redis',
    description: 'In-Memory Cache & Database',
    category: 'database',
    addCmd: 'v-add-sys-redis',
    deleteCmd: null
  },
  // Message Queue
  rabbitmq: {
    name: 'RabbitMQ',
    description: 'Message Broker (AMQP)',
    category: 'queue',
    addCmd: 'v-add-sys-rabbitmq',
    deleteCmd: null
  },
  kafka: {
    name: 'Apache Kafka',
    description: 'Distributed Streaming Platform',
    category: 'queue',
    addCmd: 'v-add-sys-kafka',
    deleteCmd: null
  },
  // Mail Stack
  exim4: {
    name: 'Exim',
    description: 'Mail Transfer Agent',
    category: 'mail',
    addCmd: 'v-add-sys-exim',
    deleteCmd: null
  },
  dovecot: {
    name: 'Dovecot',
    description: 'IMAP/POP3 Server',
    category: 'mail',
    addCmd: 'v-add-sys-dovecot',
    deleteCmd: null
  },
  clamav: {
    name: 'ClamAV',
    description: 'Antivirus Scanner',
    category: 'mail',
    addCmd: 'v-add-sys-clamav',
    deleteCmd: null
  },
  spamd: {
    name: 'SpamAssassin',
    description: 'Spam Filter',
    category: 'mail',
    addCmd: 'v-add-sys-spamd',
    deleteCmd: null
  },
  // Security
  fail2ban: {
    name: 'Fail2Ban',
    description: 'Intrusion Prevention',
    category: 'security',
    addCmd: 'v-add-sys-fail2ban',
    deleteCmd: null
  },
  iptables: {
    name: 'Firewall',
    description: 'System Firewall',
    category: 'security',
    addCmd: 'v-add-sys-firewall',
    deleteCmd: 'v-delete-sys-firewall'
  },
  // Other
  proftpd: {
    name: 'ProFTPD',
    description: 'FTP Server',
    category: 'other',
    addCmd: 'v-add-sys-proftpd',
    deleteCmd: null
  },
  bind9: {
    name: 'BIND9',
    description: 'DNS Server',
    category: 'other',
    addCmd: 'v-add-sys-bind',
    deleteCmd: null
  },
  nodejs: {
    name: 'Node.js',
    description: 'JavaScript Runtime',
    category: 'other',
    addCmd: 'v-add-sys-nodejs',
    deleteCmd: null
  }
};

// Service name mappings (config key -> possible service names in v-list-sys-services)
const SERVICE_ALIASES = {
  mysql: ['mysql', 'mariadb', 'mysqld'],
  postgresql: ['postgresql', 'postgres', 'pgsql'],
  mongodb: ['mongodb', 'mongod'],
  redis: ['redis', 'redis-server'],
  exim4: ['exim4', 'exim'],
  bind9: ['bind9', 'named', 'bind'],
  apache2: ['apache2', 'httpd', 'apache'],
  proftpd: ['proftpd', 'vsftpd', 'pure-ftpd'],
  clamav: ['clamav', 'clamav-daemon', 'clamd'],
  spamd: ['spamd', 'spamassassin'],
  phpfpm: ['php-fpm', 'php8.3-fpm', 'php8.2-fpm', 'php8.1-fpm', 'php8.0-fpm', 'php7.4-fpm'],
  rabbitmq: ['rabbitmq', 'rabbitmq-server'],
  kafka: ['kafka']
};

// Systemd service names for checking installed status
const SYSTEMD_SERVICE_NAMES = {
  haproxy: 'haproxy',
  nginx: 'nginx',
  apache2: 'apache2',
  phpfpm: 'php*-fpm',  // Will check with glob pattern
  mysql: 'mariadb',
  postgresql: 'postgresql',
  mongodb: 'mongod',
  redis: 'redis-server',
  rabbitmq: 'rabbitmq-server',
  kafka: 'kafka',
  exim4: 'exim4',
  dovecot: 'dovecot',
  clamav: 'clamav-daemon',
  spamd: 'spamassassin',
  fail2ban: 'fail2ban',
  iptables: 'iptables',
  proftpd: 'proftpd',
  bind9: 'named',
  nodejs: 'node'  // Node.js doesn't have a systemd service, will check binary
};

/**
 * GET /api/services
 * List all services and their status
 */
router.get('/', adminMiddleware, async (req, res) => {
  try {
    // Get running services
    const runningServices = await execHestiaJson('v-list-sys-services', []);

    // Check installed services via systemctl (includes stopped services)
    const { execSync } = await import('child_process');
    let installedServices = {};
    try {
      // Get all installed service unit files
      const unitFiles = execSync('systemctl list-unit-files --type=service --no-pager --no-legend 2>/dev/null || true', { encoding: 'utf8', timeout: 10000 });
      unitFiles.split('\n').forEach(line => {
        const match = line.match(/^(\S+)\.service/);
        if (match) {
          installedServices[match[1]] = true;
        }
      });
    } catch (e) {
      console.warn('Failed to get installed services:', e.message);
    }

    // Check PHP-FPM status separately (not included in v-list-sys-services)
    let phpFpmStatus = null;
    let phpFpmInstalled = false;
    try {
      // Check if any php-fpm is installed
      const phpFpmCheck = execSync('systemctl list-unit-files --type=service | grep -E "php[0-9.]+-fpm" | head -1', { encoding: 'utf8', timeout: 5000 }).trim();
      if (phpFpmCheck) {
        phpFpmInstalled = true;
        // Check if running
        const phpFpmRunning = execSync('systemctl list-units --type=service --state=running | grep -oE "php[0-9.]+-fpm" | head -1', { encoding: 'utf8', timeout: 5000 }).trim();
        if (phpFpmRunning) {
          phpFpmStatus = {
            STATE: 'running',
            CPU: '0',
            MEM: '0',
            SYSTEM: 'php fastcgi'
          };
        }
      }
    } catch (e) {
      // PHP-FPM not running or not installed
    }

    // Helper to check if service is installed
    const isInstalled = (key) => {
      // Special case for phpfpm
      if (key === 'phpfpm') return phpFpmInstalled;

      // Special case for nodejs - check binary
      if (key === 'nodejs') {
        try {
          execSync('which node', { encoding: 'utf8', timeout: 5000 });
          return true;
        } catch (e) {
          return false;
        }
      }

      const systemdName = SYSTEMD_SERVICE_NAMES[key];
      if (!systemdName) return false;

      // Check installed services
      if (installedServices[systemdName]) return true;

      // Check aliases
      const aliases = SERVICE_ALIASES[key] || [];
      for (const alias of aliases) {
        if (installedServices[alias]) return true;
      }

      return false;
    };

    // Helper to find running service by aliases
    const findRunningService = (key) => {
      // Special case for phpfpm
      if (key === 'phpfpm' && phpFpmStatus) {
        return phpFpmStatus;
      }

      // Direct match
      if (runningServices[key]) return runningServices[key];

      // Check aliases
      const aliases = SERVICE_ALIASES[key] || [];
      for (const alias of aliases) {
        if (runningServices[alias]) return runningServices[alias];
      }

      return null;
    };

    // Map services with status
    const services = Object.entries(AVAILABLE_SERVICES).map(([key, config]) => {
      const running = findRunningService(key);
      const installed = isInstalled(key) || !!running; // If running, definitely installed

      return {
        id: key,
        name: config.name,
        description: config.description,
        category: config.category,
        installed: installed,
        running: running?.STATE === 'running',
        cpu: running?.CPU || '0',
        memory: running?.MEM || '0',
        canInstall: !!config.addCmd,
        canUninstall: !!config.deleteCmd
      };
    });

    // Group by category
    const categories = {
      web: { name: 'Web Stack', icon: 'globe', services: [] },
      database: { name: 'Databases', icon: 'database', services: [] },
      queue: { name: 'Message Queue', icon: 'mail', services: [] },
      mail: { name: 'Mail Stack', icon: 'mail', services: [] },
      security: { name: 'Security', icon: 'shield', services: [] },
      other: { name: 'Other Services', icon: 'server', services: [] }
    };

    services.forEach(service => {
      if (categories[service.category]) {
        categories[service.category].services.push(service);
      }
    });

    res.json({
      services,
      categories: Object.values(categories).filter(c => c.services.length > 0)
    });
  } catch (error) {
    console.error('List services error:', error);
    res.status(500).json({ error: 'Failed to list services' });
  }
});

/**
 * POST /api/services/pbm/install
 * Install Percona Backup for MongoDB
 * NOTE: Must be defined BEFORE /:id/install to avoid route conflict
 */
router.post('/pbm/install', adminMiddleware, async (req, res) => {
  try {
    // Install PBM using the VHestiaCP script
    await execHestia('v-add-sys-pbm', [], { timeout: 600000 }); // 10 min timeout

    res.json({ success: true, message: 'Percona Backup for MongoDB installed successfully' });
  } catch (error) {
    console.error('Install PBM error:', error);
    res.status(500).json({ error: error.message || 'Failed to install PBM' });
  }
});

/**
 * DELETE /api/services/pbm
 * Uninstall Percona Backup for MongoDB
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.delete('/pbm', adminMiddleware, async (req, res) => {
  try {
    // Uninstall PBM
    await execHestia('v-delete-sys-pbm', [], { timeout: 300000 });

    res.json({ success: true, message: 'Percona Backup for MongoDB uninstalled successfully' });
  } catch (error) {
    console.error('Uninstall PBM error:', error);
    res.status(500).json({ error: error.message || 'Failed to uninstall PBM' });
  }
});

/**
 * GET /api/services/pma/status
 * Get phpMyAdmin status (installed, enabled, alias)
 * NOTE: Must be defined BEFORE /:id routes to avoid route conflict
 */
router.get('/pma/status', adminMiddleware, async (req, res) => {
  try {
    // Check if phpMyAdmin package is installed
    const installed = fs.existsSync('/usr/share/phpmyadmin');

    // Check if nginx config exists (enabled)
    const enabled = fs.existsSync('/etc/nginx/conf.d/phpmyadmin.inc');

    // Get alias and port from config
    let alias = 'pma';
    let port = 8085;
    if (enabled) {
      try {
        const configData = await execHestiaJson('v-list-sys-config', []);
        alias = configData?.config?.DB_PMA_ALIAS || 'pma';
        port = parseInt(configData?.config?.DB_PMA_PORT, 10) || 8085;
      } catch {}
    }

    res.json({
      installed,
      enabled,
      alias,
      port,
      accessUrl: enabled ? `/${alias}` : null
    });
  } catch (error) {
    console.error('Get PMA status error:', error);
    res.status(500).json({ error: 'Failed to get phpMyAdmin status' });
  }
});

/**
 * POST /api/services/pma/install-package
 * Install phpMyAdmin package (apt install phpmyadmin)
 * NOTE: Must be defined BEFORE /:id/install to avoid route conflict
 */
router.post('/pma/install-package', adminMiddleware, async (req, res) => {
  try {
    await execHestia('v-add-sys-pma-package', [], { timeout: 300000 }); // 5 min timeout for apt install

    res.json({
      success: true,
      message: 'phpMyAdmin package installed successfully'
    });
  } catch (error) {
    console.error('Install PMA package error:', error);
    res.status(500).json({ error: error.message || 'Failed to install phpMyAdmin package' });
  }
});

/**
 * POST /api/services/pma/install
 * Enable phpMyAdmin web access
 * NOTE: Must be defined BEFORE /:id/install to avoid route conflict
 */
router.post('/pma/install', adminMiddleware, async (req, res) => {
  try {
    const { alias = 'pma' } = req.body;

    await execHestia('v-add-sys-pma', [alias], { timeout: 60000 });

    res.json({
      success: true,
      message: 'phpMyAdmin enabled successfully',
      accessUrl: `/${alias}`
    });
  } catch (error) {
    console.error('Enable PMA error:', error);
    res.status(500).json({ error: error.message || 'Failed to enable phpMyAdmin' });
  }
});

/**
 * DELETE /api/services/pma
 * Disable phpMyAdmin web access
 * NOTE: Must be defined BEFORE /:id to avoid route conflict
 */
router.delete('/pma', adminMiddleware, async (req, res) => {
  try {
    await execHestia('v-delete-sys-pma', [], { timeout: 60000 });

    res.json({ success: true, message: 'phpMyAdmin disabled successfully' });
  } catch (error) {
    console.error('Disable PMA error:', error);
    res.status(500).json({ error: error.message || 'Failed to disable phpMyAdmin' });
  }
});

/**
 * PUT /api/services/pma/alias
 * Change phpMyAdmin URL alias
 */
router.put('/pma/alias', adminMiddleware, async (req, res) => {
  try {
    const { alias } = req.body;

    if (!alias) {
      return res.status(400).json({ error: 'Alias is required' });
    }

    await execHestia('v-change-sys-db-alias', ['pma', alias], { timeout: 60000 });

    res.json({
      success: true,
      message: 'phpMyAdmin alias changed successfully',
      accessUrl: `/${alias}`
    });
  } catch (error) {
    console.error('Change PMA alias error:', error);
    res.status(500).json({ error: error.message || 'Failed to change phpMyAdmin alias' });
  }
});

/**
 * POST /api/services/:id/install
 * Install a service
 */
router.post('/:id/install', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const config = AVAILABLE_SERVICES[id];

    if (!config) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!config.addCmd) {
      return res.status(400).json({ error: 'This service cannot be installed via API' });
    }

    await execHestia(config.addCmd, [], { timeout: 300000 }); // 5 min timeout

    res.json({ success: true, message: `${config.name} installed successfully` });
  } catch (error) {
    console.error('Install service error:', error);
    res.status(500).json({ error: error.message || 'Failed to install service' });
  }
});

/**
 * DELETE /api/services/:id
 * Uninstall a service
 */
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const config = AVAILABLE_SERVICES[id];

    if (!config) {
      return res.status(404).json({ error: 'Service not found' });
    }

    if (!config.deleteCmd) {
      return res.status(400).json({ error: 'This service cannot be uninstalled via API' });
    }

    await execHestia(config.deleteCmd, [], { timeout: 300000 });

    res.json({ success: true, message: `${config.name} uninstalled successfully` });
  } catch (error) {
    console.error('Uninstall service error:', error);
    res.status(500).json({ error: error.message || 'Failed to uninstall service' });
  }
});

/**
 * POST /api/services/:id/restart
 * Restart a service
 */
router.post('/:id/restart', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id === 'mongodb' ? 'mongod' : id;

    await execHestia('v-restart-service', [serviceName]);

    res.json({ success: true, message: 'Service restarted successfully' });
  } catch (error) {
    console.error('Restart service error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart service' });
  }
});

/**
 * POST /api/services/:id/start
 * Start a service
 */
router.post('/:id/start', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id === 'mongodb' ? 'mongod' : id;

    await execHestia('v-start-service', [serviceName]);

    res.json({ success: true, message: 'Service started successfully' });
  } catch (error) {
    console.error('Start service error:', error);
    res.status(500).json({ error: error.message || 'Failed to start service' });
  }
});

/**
 * POST /api/services/:id/stop
 * Stop a service
 */
router.post('/:id/stop', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const serviceName = id === 'mongodb' ? 'mongod' : id;

    await execHestia('v-stop-service', [serviceName]);

    res.json({ success: true, message: 'Service stopped successfully' });
  } catch (error) {
    console.error('Stop service error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop service' });
  }
});

export default router;
