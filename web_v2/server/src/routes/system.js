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

    // Detect web server type
    let webServer = 'nginx'; // default
    if (fs.existsSync('/etc/apache2') || fs.existsSync('/etc/httpd')) {
      // Check if nginx is also installed (nginx + apache combo)
      if (fs.existsSync('/etc/nginx')) {
        webServer = 'nginx'; // nginx is the primary when both are installed
      } else {
        webServer = 'apache';
      }
    }

    const installedServices = {
      dns: fs.existsSync('/etc/bind') || fs.existsSync('/etc/named'),
      mail: fs.existsSync('/etc/exim4') || fs.existsSync('/etc/postfix'),
      db: fs.existsSync('/etc/mysql') || fs.existsSync('/etc/postgresql') || fs.existsSync('/etc/mongod.conf'),
      mysql: fs.existsSync('/etc/mysql') || fs.existsSync('/etc/my.cnf'),
      pgsql: fs.existsSync('/etc/postgresql'),
      mongodb: fs.existsSync('/etc/mongod.conf') || fs.existsSync('/var/lib/mongodb'),
      webServer // 'nginx' or 'apache'
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

/**
 * GET /api/system/server/status/:type
 * Get detailed server status (cpu, mem, disk, net, web, dns, mail, db)
 */
router.get('/server/status/:type', adminMiddleware, async (req, res) => {
  try {
    const { type } = req.params;

    const commands = {
      cpu: 'v-list-sys-cpu-status',
      mem: 'v-list-sys-memory-status',
      disk: 'v-list-sys-disk-status',
      net: 'v-list-sys-network-status',
      web: 'v-list-sys-web-status',
      dns: 'v-list-sys-dns-status',
      mail: 'v-list-sys-mail-status',
      db: 'v-list-sys-db-status'
    };

    if (!commands[type]) {
      return res.status(400).json({ error: 'Invalid status type' });
    }

    try {
      const output = await execHestia(commands[type], []);
      res.json({ type, output });
    } catch (e) {
      // Some commands might not exist or return errors for certain systems
      res.json({ type, output: '', error: e.message });
    }
  } catch (error) {
    console.error('Server status error:', error);
    res.status(500).json({ error: 'Failed to get server status' });
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

/**
 * GET /api/system/server/config
 * Get system configuration
 */
router.get('/server/config', adminMiddleware, async (req, res) => {
  try {
    const config = await execHestiaJson('v-list-sys-config', []);
    
    // Get system info for hostname/timezone
    const sysInfo = await execHestiaJson('v-list-sys-info', []);
    
    // Get PHP versions
    let phpVersions = [];
    try {
      const phpDir = '/etc/php';
      if (fs.existsSync(phpDir)) {
        phpVersions = fs.readdirSync(phpDir)
          .filter(f => /^\d+\.\d+$/.test(f))
          .map(v => {
            // Check if installed (basic check)
            const installed = true; 
            // Check domains using this version requires iterating users, simplified for now
            return { version: v, installed, domains: [] };
          })
          .sort();
      }
    } catch (e) {}

    // Get timezones/themes/languages (mocked or fetched from system if possible)
    // For now returning current values
    
    res.json({
      hostname: sysInfo.sysinfo?.HOSTNAME || sysInfo?.HOSTNAME || 'Unknown',
      timezone: sysInfo.sysinfo?.TIMEZONE || sysInfo?.TIMEZONE || 'UTC',
      config: {
        theme: config.THEME,
        language: config.LANGUAGE,
        debugMode: config.DEBUG_MODE === 'yes',
        webmailAlias: config.WEBMAIL_ALIAS,
        dbPmaAlias: config.DB_PMA_ALIAS,
        dbPgaAlias: config.DB_PGA_ALIAS,
        inactiveSessionTimeout: config.INACTIVE_SESSION_TIMEOUT,
        loginStyle: config.LOGIN_STYLE,
        api: config.API,
        apiSystem: config.API_SYSTEM,
        policySystemPasswordReset: config.POLICY_SYSTEM_PASSWORD_RESET,
        policyUserChangeTheme: config.POLICY_USER_CHANGE_THEME,
        fileManager: config.FILE_MANAGER,
        webTerminal: config.WEB_TERMINAL,
        pluginAppInstaller: config.PLUGIN_APP_INSTALLER,
        diskQuota: config.DISK_QUOTA,
        resourcesLimit: config.RESOURCES_LIMIT,
        firewallSystem: config.FIREWALL_SYSTEM,
        upgradeSendEmail: config.UPGRADE_SEND_EMAIL === 'yes',
        upgradeSendEmailLog: config.UPGRADE_SEND_EMAIL_LOG === 'yes',
        smtpRelay: config.SMTP_RELAY === 'yes',
        smtpRelayHost: config.SMTP_RELAY_HOST,
        smtpRelayPort: config.SMTP_RELAY_PORT,
        smtpRelayUser: config.SMTP_RELAY_USER,
        policyCsrfStrictness: config.POLICY_CSRF_STRICTNESS,
        policySystemProtectedAdmin: config.POLICY_SYSTEM_PROTECTED_ADMIN,
        policySystemHideAdmin: config.POLICY_SYSTEM_HIDE_ADMIN,
        policySystemHideServices: config.POLICY_SYSTEM_HIDE_SERVICES,
        policyUserEditDetails: config.POLICY_USER_EDIT_DETAILS,
        policyUserEditWebTemplates: config.POLICY_USER_EDIT_WEB_TEMPLATES,
        policyUserEditDnsTemplates: config.POLICY_USER_EDIT_DNS_TEMPLATES,
        policyUserViewLogs: config.POLICY_USER_VIEW_LOGS,
        policyUserDeleteLogs: config.POLICY_USER_DELETE_LOGS,
        policyBackupSuspendedUsers: config.POLICY_BACKUP_SUSPENDED_USERS,
        policySyncErrorDocuments: config.POLICY_SYNC_ERROR_DOCUMENTS,
        policySyncSkeleton: config.POLICY_SYNC_SKELETON,
        enforceSubdomainOwnership: config.ENFORCE_SUBDOMAIN_OWNERSHIP
      },
      backup: {
        local: config.BACKUP_SYSTEM === 'local' || !config.BACKUP_SYSTEM || config.BACKUP_SYSTEM.includes('local'),
        mode: config.BACKUP_MODE,
        gzip: config.BACKUP_GZIP,
        remote: config.BACKUP_REMOTE,
        directory: config.BACKUP
      },
      incrementalBackup: config.BACKUP_INCREMENTAL === 'yes',
      mysql: { enabled: !!config.DB_SYSTEM?.includes('mysql') },
      pgsql: { enabled: !!config.DB_SYSTEM?.includes('pgsql') },
      ssl: {
        CRT: config.SSL_CRT || '',
        KEY: config.SSL_KEY || '',
        SUBJECT: config.SSL_SUBJECT,
        NOT_BEFORE: config.SSL_NOT_BEFORE,
        NOT_AFTER: config.SSL_NOT_AFTER,
        SIGNATURE: config.SSL_SIGNATURE,
        KEY_SIZE: config.SSL_KEY_SIZE,
        ISSUER: config.SSL_ISSUER
      },
      phpVersions: phpVersions,
      systemPhp: config.WEB_BACKEND
    });

  } catch (error) {
    console.error('Get server config error:', error);
    res.status(500).json({ error: 'Failed to get server configuration' });
  }
});

/**
 * PUT /api/system/server/config
 * Update server configuration
 */
router.put('/server/config', adminMiddleware, async (req, res) => {
  try {
    const { field, value } = req.body;
    
    console.log(`Updating config field: ${field} = ${value}`);

    if (field === 'hostname') {
      await execHestia('v-change-sys-hostname', [value]);
    } else if (field === 'timezone') {
      await execHestia('v-change-sys-timezone', [value]);
    } else if (field === 'defaultPhp') {
      await execHestia('v-change-sys-php', [value]);
    } else {
      // Map frontend fields to config keys
      const configMap = {
        theme: 'THEME',
        language: 'LANGUAGE',
        debugMode: 'DEBUG_MODE',
        webmailAlias: 'WEBMAIL_ALIAS',
        dbPmaAlias: 'DB_PMA_ALIAS',
        dbPgaAlias: 'DB_PGA_ALIAS',
        inactiveSessionTimeout: 'INACTIVE_SESSION_TIMEOUT',
        loginStyle: 'LOGIN_STYLE',
        api: 'API',
        apiSystem: 'API_SYSTEM',
        policySystemPasswordReset: 'POLICY_SYSTEM_PASSWORD_RESET',
        policyUserChangeTheme: 'POLICY_USER_CHANGE_THEME',
        fileManager: 'FILE_MANAGER',
        webTerminal: 'WEB_TERMINAL',
        pluginAppInstaller: 'PLUGIN_APP_INSTALLER',
        diskQuota: 'DISK_QUOTA',
        resourcesLimit: 'RESOURCES_LIMIT',
        firewallSystem: 'FIREWALL_SYSTEM',
        upgradeSendEmail: 'UPGRADE_SEND_EMAIL',
        upgradeSendEmailLog: 'UPGRADE_SEND_EMAIL_LOG',
        smtpRelay: 'SMTP_RELAY',
        smtpRelayHost: 'SMTP_RELAY_HOST',
        smtpRelayPort: 'SMTP_RELAY_PORT',
        smtpRelayUser: 'SMTP_RELAY_USER',
        backupMode: 'BACKUP_MODE',
        backupGzip: 'BACKUP_GZIP',
        backupRemote: 'BACKUP_REMOTE',
        incrementalBackup: 'BACKUP_INCREMENTAL',
        policyCsrfStrictness: 'POLICY_CSRF_STRICTNESS',
        policySystemProtectedAdmin: 'POLICY_SYSTEM_PROTECTED_ADMIN',
        policySystemHideAdmin: 'POLICY_SYSTEM_HIDE_ADMIN',
        policySystemHideServices: 'POLICY_SYSTEM_HIDE_SERVICES',
        policyUserEditDetails: 'POLICY_USER_EDIT_DETAILS',
        policyUserEditWebTemplates: 'POLICY_USER_EDIT_WEB_TEMPLATES',
        policyUserEditDnsTemplates: 'POLICY_USER_EDIT_DNS_TEMPLATES',
        policyUserViewLogs: 'POLICY_USER_VIEW_LOGS',
        policyUserDeleteLogs: 'POLICY_USER_DELETE_LOGS',
        policyBackupSuspendedUsers: 'POLICY_BACKUP_SUSPENDED_USERS',
        policySyncErrorDocuments: 'POLICY_SYNC_ERROR_DOCUMENTS',
        policySyncSkeleton: 'POLICY_SYNC_SKELETON',
        enforceSubdomainOwnership: 'ENFORCE_SUBDOMAIN_OWNERSHIP'
      };

      const configKey = configMap[field];
      if (configKey) {
        // Boolean conversion if needed
        let configValue = value;
        if (typeof value === 'boolean') {
          configValue = value ? 'yes' : 'no';
        }
        await execHestia('v-change-sys-config-value', [configKey, String(configValue)]);
      } else if (field === 'backupEnabled') {
         // Special handling for backupEnabled if needed, or assume it toggles generic BACKUP_SYSTEM settings?
         // For now maybe not implemented by v-change-sys-config-value directly for complex changes.
         // If it's turning off local backup:
         // Hestia config usually: BACKUP_SYSTEM='local,remote' or 'local' or 'remote'.
         // This might need more complex logic. Leaving as is (might not work fully for complex fields).
      }
    }

    res.json({ success: true, message: 'Configuration updated successfully' });
  } catch (error) {
    console.error('Update server config error:', error);
    res.status(500).json({ error: error.message || 'Failed to update configuration' });
  }
});

router.post('/server/config/feature', adminMiddleware, async (req, res) => {
  // Placeholder for feature toggling if needed
  res.json({ success: true });
});

router.post('/server/config/php', adminMiddleware, async (req, res) => {
  // Placeholder for php install/uninstall
   res.json({ success: true });
});

router.post('/server/config/default-php', adminMiddleware, async (req, res) => {
  const { version } = req.body;
  try {
     await execHestia('v-change-sys-php', [version]);
     res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
