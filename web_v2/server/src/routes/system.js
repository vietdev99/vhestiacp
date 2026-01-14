import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execHestiaJson, execHestia } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';
const TEMPLATES_DIR = path.join(HESTIA_DIR, 'data/templates/web/nginx/php-fpm');

// Service descriptions mapping
const SERVICE_DESCRIPTIONS = {
  'bind9': 'dns server',
  'named': 'dns server',
  'cron': 'job scheduler',
  'haproxy': 'load balancer',
  'iptables': 'firewall',
  'fail2ban': 'intrusion prevention',
  'mariadb': 'database server',
  'mysql': 'database server',
  'postgresql': 'database server',
  'mongodb': 'nosql database',
  'nginx': 'web server',
  'apache2': 'web server',
  'httpd': 'web server',
  'ssh': 'ssh server',
  'sshd': 'ssh server',
  'exim4': 'mail server',
  'postfix': 'mail server',
  'dovecot': 'imap/pop3 server',
  'clamd': 'antivirus',
  'clamav-daemon': 'antivirus',
  'spamassassin': 'spam filter',
  'spamd': 'spam filter',
  'vsftpd': 'ftp server',
  'proftpd': 'ftp server',
  'pure-ftpd': 'ftp server',
  'opendkim': 'dkim signing',
  'redis-server': 'cache server',
  'memcached': 'cache server',
  'php-fpm': 'php processor'
};

// Helper to humanize time (seconds to human readable)
const humanizeTime = (seconds) => {
  if (!seconds || seconds <= 0) return '0 minutes';

  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  const parts = [];
  if (days > 0) parts.push(`${days} day${days !== 1 ? 's' : ''}`);
  if (hours > 0) parts.push(`${hours} hour${hours !== 1 ? 's' : ''}`);
  if (minutes > 0 || parts.length === 0) parts.push(`${minutes} minute${minutes !== 1 ? 's' : ''}`);

  return parts.join(' ');
};

// Get service description
const getServiceDescription = (serviceName) => {
  if (SERVICE_DESCRIPTIONS[serviceName]) {
    return SERVICE_DESCRIPTIONS[serviceName];
  }
  if (serviceName.includes('php') && serviceName.includes('fpm')) {
    return 'php processor';
  }
  return serviceName;
};

/**
 * GET /api/system/server
 * Get server info and running services
 */
router.get('/server', adminMiddleware, async (req, res) => {
  try {
    let systemInfo = {};
    try {
      const sysData = await execHestiaJson('v-list-sys-info', []);
      systemInfo = sysData?.sysinfo || sysData || {};
    } catch (e) {
      console.error('Failed to get system info:', e);
    }

    let servicesData = {};
    try {
      servicesData = await execHestiaJson('v-list-sys-services', []);
    } catch (e) {
      console.error('Failed to get services:', e);
    }

    const hestiaVersion = systemInfo.HESTIA || '';

    const services = Object.entries(servicesData || {})
      .map(([name, data]) => ({
        name,
        state: data.STATE || 'stopped',
        description: data.SYSTEM || getServiceDescription(name),
        uptime: humanizeTime(parseInt(data.RTIME) || 0),
        uptimeSeconds: parseInt(data.RTIME) || 0,
        cpu: ((parseFloat(data.CPU) || 0) / 10).toFixed(1),
        memory: parseFloat(data.MEM) || 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      system: {
        hostname: systemInfo.HOSTNAME || 'Unknown',
        os: systemInfo.OS || 'Unknown',
        version: systemInfo.VERSION || '',
        arch: systemInfo.ARCH || '',
        loadAverage: systemInfo.LOADAVERAGE || '0 / 0 / 0',
        uptime: humanizeTime(parseInt(systemInfo.UPTIME) || 0),
        uptimeSeconds: parseInt(systemInfo.UPTIME) || 0,
        hestiaVersion
      },
      services
    });
  } catch (error) {
    console.error('Server info error:', error);
    res.status(500).json({ error: 'Failed to get server info' });
  }
});

/**
 * POST /api/system/server/services/:name/restart
 */
router.post('/server/services/:name/restart', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    await execHestia('v-restart-service', [name]);
    res.json({ success: true, message: `Service ${name} restarted successfully` });
  } catch (error) {
    console.error('Restart service error:', error);
    res.status(500).json({ error: `Failed to restart service ${req.params.name}` });
  }
});

/**
 * POST /api/system/server/services/:name/start
 */
router.post('/server/services/:name/start', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    await execHestia('v-start-service', [name]);
    res.json({ success: true, message: `Service ${name} started successfully` });
  } catch (error) {
    console.error('Start service error:', error);
    res.status(500).json({ error: `Failed to start service ${req.params.name}` });
  }
});

/**
 * POST /api/system/server/services/:name/stop
 */
router.post('/server/services/:name/stop', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    await execHestia('v-stop-service', [name]);
    res.json({ success: true, message: `Service ${name} stopped successfully` });
  } catch (error) {
    console.error('Stop service error:', error);
    res.status(500).json({ error: `Failed to stop service ${req.params.name}` });
  }
});

/**
 * GET /api/system/info
 */
router.get('/info', async (req, res) => {
  try {
    let shells = ['/bin/bash', '/bin/sh', '/usr/sbin/nologin'];
    try {
      const shellsData = fs.readFileSync('/etc/shells', 'utf8');
      shells = shellsData.split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
    } catch (e) {}

    let phpVersions = [];
    try {
      const phpDir = '/etc/php';
      if (fs.existsSync(phpDir)) {
        phpVersions = fs.readdirSync(phpDir).filter(f => /^\d+\.\d+$/.test(f)).map(v => `php${v}`).sort();
      }
    } catch (e) {}

    let packages = ['default'];
    try {
      const packagesDir = path.join(HESTIA_DIR, 'data/packages');
      if (fs.existsSync(packagesDir)) {
        packages = fs.readdirSync(packagesDir).filter(f => f.endsWith('.pkg')).map(f => f.replace('.pkg', ''));
      }
    } catch (e) {}

    let ips = [];
    try {
      const ipsData = await execHestiaJson('v-list-sys-ips', []);
      ips = Object.entries(ipsData || {}).map(([ip, data]) => data.NAT || ip).filter((ip, index, self) => self.indexOf(ip) === index);
    } catch (e) {
      try {
        const ipsDir = path.join(HESTIA_DIR, 'data/ips');
        if (fs.existsSync(ipsDir)) {
          ips = fs.readdirSync(ipsDir).filter(f => !f.startsWith('.'));
        }
      } catch (e2) {}
    }

    let webTemplates = ['default'];
    try {
      const templatesDir = path.join(HESTIA_DIR, 'data/templates/web/nginx/php-fpm');
      if (fs.existsSync(templatesDir)) {
        webTemplates = fs.readdirSync(templatesDir).filter(f => f.endsWith('.tpl') && !f.endsWith('.stpl')).map(f => f.replace('.tpl', '')).filter(f => f !== 'suspended').sort();
      }
    } catch (e) {}

    let backendTemplates = ['default'];
    try {
      const backendDir = path.join(HESTIA_DIR, 'data/templates/web/php-fpm');
      if (fs.existsSync(backendDir)) {
        backendTemplates = fs.readdirSync(backendDir).filter(f => f.endsWith('.tpl')).map(f => f.replace('.tpl', '')).sort();
      }
    } catch (e) {}

    const webStats = ['none', 'awstats', 'webalizer'];

    const installedServices = {
      dns: fs.existsSync('/etc/bind') || fs.existsSync('/etc/named'),
      mail: fs.existsSync('/etc/exim4') || fs.existsSync('/etc/postfix'),
      db: fs.existsSync('/etc/mysql') || fs.existsSync('/etc/postgresql') || fs.existsSync('/etc/mongod.conf'),
      mysql: fs.existsSync('/etc/mysql') || fs.existsSync('/etc/my.cnf'),
      pgsql: fs.existsSync('/etc/postgresql'),
      mongodb: fs.existsSync('/etc/mongod.conf') || fs.existsSync('/var/lib/mongodb')
    };

    // Check if file manager is enabled
    let fileManager = true; // Default to enabled for admin
    try {
      const hestiaConf = path.join(HESTIA_DIR, 'conf/hestia.conf');
      if (fs.existsSync(hestiaConf)) {
        const conf = fs.readFileSync(hestiaConf, 'utf8');
        const fmMatch = conf.match(/^FILE_MANAGER='?(yes|no)'?/m);
        if (fmMatch) {
          fileManager = fmMatch[1] === 'yes';
        }
      }
    } catch (e) {}

    let dnsTemplates = ['default'];
    try {
      const dnsTemplatesDir = path.join(HESTIA_DIR, 'data/templates/dns');
      if (fs.existsSync(dnsTemplatesDir)) {
        dnsTemplates = fs.readdirSync(dnsTemplatesDir).filter(f => f.endsWith('.tpl')).map(f => f.replace('.tpl', '')).sort();
      }
    } catch (e) {}

    const languages = [
      { code: 'en', name: 'English' },
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'ru', name: 'Русский' },
      { code: 'zh-cn', name: '中文 (简体)' },
      { code: 'ja', name: '日本語' },
      { code: 'pt-br', name: 'Português (BR)' },
      { code: 'nl', name: 'Nederlands' },
      { code: 'pl', name: 'Polski' },
      { code: 'it', name: 'Italiano' }
    ];

    res.json({ shells, phpVersions, packages, languages, ips, webTemplates, backendTemplates, webStats, installedServices, dnsTemplates, fileManager });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

/**
 * GET /api/system/templates/:name
 */
router.get('/templates/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const tplPath = path.join(TEMPLATES_DIR, `${name}.tpl`);
    const stplPath = path.join(TEMPLATES_DIR, `${name}.stpl`);

    let tpl = '';
    let stpl = '';

    if (fs.existsSync(tplPath)) {
      tpl = fs.readFileSync(tplPath, 'utf8');
    }
    if (fs.existsSync(stplPath)) {
      stpl = fs.readFileSync(stplPath, 'utf8');
    }

    if (!tpl && !stpl) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ name, tpl, stpl });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * POST /api/system/templates
 */
router.post('/templates', adminMiddleware, async (req, res) => {
  try {
    const { name, tpl, stpl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid template name. Use only letters, numbers, dashes, and underscores.' });
    }

    const tplPath = path.join(TEMPLATES_DIR, `${name}.tpl`);
    const stplPath = path.join(TEMPLATES_DIR, `${name}.stpl`);

    if (fs.existsSync(tplPath) || fs.existsSync(stplPath)) {
      return res.status(400).json({ error: 'Template already exists' });
    }

    if (tpl) {
      fs.writeFileSync(tplPath, tpl, 'utf8');
    }
    if (stpl) {
      fs.writeFileSync(stplPath, stpl, 'utf8');
    }

    res.json({ success: true, name });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

// Service configuration types mapping
const SERVICE_CONFIG_TYPES = {
  nginx: { type: 'basic-advanced', listCmd: 'v-list-sys-nginx-config' },
  'php-fpm': { type: 'basic-advanced', listCmd: 'v-list-sys-php-config' },
  mysql: { type: 'basic-advanced', listCmd: 'v-list-sys-mysql-config' },
  mariadb: { type: 'basic-advanced', listCmd: 'v-list-sys-mysql-config' },
  postgresql: { type: 'dual-config', listCmd: 'v-list-sys-pgsql-config' },
  bind9: { type: 'single-config', configPath: '/etc/bind/named.conf.options' },
  named: { type: 'single-config', configPath: '/etc/named.conf' },
  dovecot: { type: 'single-config', configPath: '/etc/dovecot/dovecot.conf' },
  exim4: { type: 'single-config', configPath: '/etc/exim4/exim4.conf.template' },
  fail2ban: { type: 'single-config', configPath: '/etc/fail2ban/jail.local' },
  vsftpd: { type: 'single-config', configPath: '/etc/vsftpd.conf' },
  proftpd: { type: 'single-config', configPath: '/etc/proftpd/proftpd.conf' },
  ssh: { type: 'single-config', configPath: '/etc/ssh/sshd_config' },
  sshd: { type: 'single-config', configPath: '/etc/ssh/sshd_config' },
  apache2: { type: 'single-config', configPath: '/etc/apache2/apache2.conf' },
  httpd: { type: 'single-config', configPath: '/etc/httpd/conf/httpd.conf' },
  'clamav-daemon': { type: 'single-config', configPath: '/etc/clamav/clamd.conf' },
  clamd: { type: 'single-config', configPath: '/etc/clamd.d/scan.conf' },
  spamassassin: { type: 'single-config', configPath: '/etc/spamassassin/local.cf' },
  spamd: { type: 'single-config', configPath: '/etc/default/spamassassin' },
  haproxy: { type: 'single-config', configPath: '/etc/haproxy/haproxy.cfg' },
  redis: { type: 'single-config', configPath: '/etc/redis/redis.conf' },
  'redis-server': { type: 'single-config', configPath: '/etc/redis/redis.conf' }
};

/**
 * GET /api/system/server/services/:name/config
 * Get service configuration
 */
router.get('/server/services/:name/config', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const serviceConfig = SERVICE_CONFIG_TYPES[name];

    let result = {
      name,
      type: serviceConfig?.type || 'single-config',
      settings: {},
      config: '',
      configPath: '',
      options: '',
      optionsPath: ''
    };

    // For services with specific list commands (nginx, php, mysql)
    if (serviceConfig?.listCmd) {
      try {
        const configData = await execHestiaJson(serviceConfig.listCmd, []);
        if (configData?.CONFIG) {
          result.settings = configData.CONFIG;
          result.configPath = configData.CONFIG.config_path || '';
          if (configData.CONFIG.options_path) {
            result.optionsPath = configData.CONFIG.options_path;
          }
        }
      } catch (e) {
        console.error(`Failed to get ${name} config:`, e);
      }
    } else if (serviceConfig?.configPath) {
      // For services with hardcoded config paths
      result.configPath = serviceConfig.configPath;
    }

    // Read config file content directly
    if (result.configPath) {
      try {
        if (fs.existsSync(result.configPath)) {
          result.config = fs.readFileSync(result.configPath, 'utf8');
        }
      } catch (e) {
        console.error(`Failed to read config file:`, e);
      }
    }

    // For services with options file
    if (result.optionsPath) {
      try {
        if (fs.existsSync(result.optionsPath)) {
          result.options = fs.readFileSync(result.optionsPath, 'utf8');
        }
      } catch (e) {
        console.error(`Failed to read options file:`, e);
      }
    }

    res.json(result);
  } catch (error) {
    console.error('Get service config error:', error);
    res.status(500).json({ error: `Failed to get configuration for ${req.params.name}` });
  }
});

/**
 * PUT /api/system/server/services/:name/config
 * Update service configuration
 */
router.put('/server/services/:name/config', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const { config, restart = true } = req.body;

    if (!config) {
      return res.status(400).json({ error: 'Configuration content is required' });
    }

    // Write config to temp file
    const tmpDir = '/tmp';
    const tmpFile = path.join(tmpDir, `hestia_config_${Date.now()}`);

    // Normalize line endings
    const normalizedConfig = config.replace(/\r\n/g, '\n');
    fs.writeFileSync(tmpFile, normalizedConfig, 'utf8');

    try {
      const restartFlag = restart ? 'yes' : 'no';
      await execHestia('v-change-sys-service-config', [tmpFile, name, restartFlag]);

      // Cleanup temp file
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }

      res.json({ success: true, message: `Configuration for ${name} updated successfully` });
    } catch (e) {
      // Cleanup temp file on error
      if (fs.existsSync(tmpFile)) {
        fs.unlinkSync(tmpFile);
      }
      throw e;
    }
  } catch (error) {
    console.error('Update service config error:', error);
    res.status(500).json({ error: `Failed to update configuration for ${req.params.name}` });
  }
});

// Service units for RRD charts
const SERVICE_UNITS = {
  la: 'Points',
  mem: 'Mbytes',
  apache2: 'Connections',
  nginx: 'Connections',
  mail: 'Queue Size',
  ftp: 'Connections',
  ssh: 'Connections'
};

/**
 * GET /api/system/rrd/list
 * List available RRD charts
 */
router.get('/rrd/list', adminMiddleware, async (req, res) => {
  try {
    const rrdData = await execHestiaJson('v-list-sys-rrd', []);

    // Transform to array format
    const charts = Object.values(rrdData || {}).map(item => ({
      type: item.TYPE,
      rrd: item.RRD,
      title: item.TITLE,
      service: item.TYPE !== 'net' ? item.RRD : `net_${item.RRD}`
    }));

    res.json({ charts });
  } catch (error) {
    console.error('List RRD error:', error);
    res.status(500).json({ error: 'Failed to list RRD charts' });
  }
});

/**
 * POST /api/system/rrd/export
 * Export RRD chart data
 */
router.post('/rrd/export', adminMiddleware, async (req, res) => {
  try {
    const { service = 'la', period = 'daily' } = req.body;

    // Validate period
    const allowedPeriods = ['daily', 'weekly', 'monthly', 'yearly', 'biennially', 'triennially'];
    if (!allowedPeriods.includes(period)) {
      return res.status(400).json({ error: 'Invalid period' });
    }

    // Get RRD data
    const output = await execHestia('v-export-rrd', [service, period]);

    let data;
    try {
      data = JSON.parse(output);
    } catch (e) {
      console.error('Failed to parse RRD data:', output);
      return res.status(500).json({ error: 'Failed to parse RRD data' });
    }

    // Add service and unit info
    data.service = service;

    // Determine unit
    let unit = SERVICE_UNITS[service] || null;
    if (service.startsWith('net_')) {
      unit = 'KBytes';
    } else if (service.startsWith('pgsql_') || service.startsWith('mysql_')) {
      unit = 'Queries';
    }
    data.unit = unit;

    res.json(data);
  } catch (error) {
    console.error('Export RRD error:', error);
    res.status(500).json({ error: 'Failed to export RRD data' });
  }
});

export default router;
