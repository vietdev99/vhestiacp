import { Router } from 'express';
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
  exim4: ['exim4', 'exim'],
  bind9: ['bind9', 'named', 'bind'],
  apache2: ['apache2', 'httpd', 'apache'],
  proftpd: ['proftpd', 'vsftpd', 'pure-ftpd'],
  clamav: ['clamav', 'clamav-daemon', 'clamd'],
  spamd: ['spamd', 'spamassassin']
};

/**
 * GET /api/services
 * List all services and their status
 */
router.get('/', adminMiddleware, async (req, res) => {
  try {
    // Get running services
    const runningServices = await execHestiaJson('v-list-sys-services', []);

    // Helper to find service by aliases
    const findService = (key) => {
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
      const running = findService(key);

      return {
        id: key,
        name: config.name,
        description: config.description,
        category: config.category,
        installed: !!running,
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

    await execHestia('v-restart-service', [id]);

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

    await execHestia('v-start-service', [id]);

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

    await execHestia('v-stop-service', [id]);

    res.json({ success: true, message: 'Service stopped successfully' });
  } catch (error) {
    console.error('Stop service error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop service' });
  }
});

export default router;
