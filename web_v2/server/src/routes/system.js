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

    // Add database instance services
    const dbInstanceServices = [];

    // MongoDB instances
    try {
      const mongoMetaFile = path.join(HESTIA_DIR, 'data/mongodb-instances.json');
      if (fs.existsSync(mongoMetaFile)) {
        const mongoData = JSON.parse(fs.readFileSync(mongoMetaFile, 'utf8'));
        if (mongoData.instances && Array.isArray(mongoData.instances)) {
          for (const instance of mongoData.instances) {
            // Check service status
            let state = 'stopped';
            let cpu = '0.0';
            let memory = 0;
            let uptime = '0 minutes';
            try {
              const statusOutput = execSync(`systemctl is-active ${instance.serviceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
              if (statusOutput === 'active') {
                state = 'running';
                // Get process info
                try {
                  const pidOutput = execSync(`systemctl show ${instance.serviceName} -p MainPID --value 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim();
                  if (pidOutput && pidOutput !== '0') {
                    const psOutput = execSync(`ps -p ${pidOutput} -o %cpu,%mem,etimes --no-headers 2>/dev/null || echo "0 0 0"`, { encoding: 'utf8' }).trim();
                    const [cpuVal, memVal, etimes] = psOutput.split(/\s+/);
                    cpu = (parseFloat(cpuVal) || 0).toFixed(1);
                    memory = parseFloat(memVal) || 0;
                    uptime = humanizeTime(parseInt(etimes) || 0);
                  }
                } catch (e) {}
              }
            } catch (e) {}

            // Load settings from individual settings file to get accurate PBM and clusterMode info
            let instanceSettings = {};
            try {
              const settingsFile = path.join(HESTIA_DIR, `data/mongodb-instances/${instance.name}-settings.json`);
              if (fs.existsSync(settingsFile)) {
                instanceSettings = JSON.parse(fs.readFileSync(settingsFile, 'utf8'));
              }
            } catch (e) {}

            const clusterMode = instanceSettings.clusterMode || instance.clusterMode || 'standalone';

            dbInstanceServices.push({
              name: instance.serviceName,
              state,
              description: `MongoDB instance: ${instance.name} (port ${instance.port})`,
              uptime,
              uptimeSeconds: 0,
              cpu,
              memory,
              isDbInstance: true,
              dbType: 'mongodb',
              instanceName: instance.name,
              clusterMode
            });

            // Check for PBM agent service if PBM is enabled for this instance
            // Check both instance.pbm and settings file for PBM config
            const pbmEnabled = instanceSettings.pbm?.enabled || instance.pbm?.enabled;
            if (pbmEnabled) {
              const pbmServiceName = instance.name === 'default' ? 'pbm-agent' : `pbm-agent-${instance.name}`;
              let pbmState = 'stopped';
              let pbmCpu = '0.0';
              let pbmMemory = 0;
              let pbmUptime = '0 minutes';
              try {
                const pbmStatusOutput = execSync(`systemctl is-active ${pbmServiceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
                if (pbmStatusOutput === 'active') {
                  pbmState = 'running';
                  try {
                    const pbmPidOutput = execSync(`systemctl show ${pbmServiceName} -p MainPID --value 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim();
                    if (pbmPidOutput && pbmPidOutput !== '0') {
                      const pbmPsOutput = execSync(`ps -p ${pbmPidOutput} -o %cpu,%mem,etimes --no-headers 2>/dev/null || echo "0 0 0"`, { encoding: 'utf8' }).trim();
                      const [pbmCpuVal, pbmMemVal, pbmEtimes] = pbmPsOutput.split(/\s+/);
                      pbmCpu = (parseFloat(pbmCpuVal) || 0).toFixed(1);
                      pbmMemory = parseFloat(pbmMemVal) || 0;
                      pbmUptime = humanizeTime(parseInt(pbmEtimes) || 0);
                    }
                  } catch (e) {}
                }
              } catch (e) {}

              dbInstanceServices.push({
                name: pbmServiceName,
                state: pbmState,
                description: `PBM Agent for MongoDB: ${instance.name}`,
                uptime: pbmUptime,
                uptimeSeconds: 0,
                cpu: pbmCpu,
                memory: pbmMemory,
                isDbInstance: true,
                dbType: 'mongodb-pbm',
                instanceName: instance.name,
                parentService: instance.serviceName
              });
            }
          }
        }
      }
    } catch (e) {
      console.error('Failed to get MongoDB instances:', e);
    }

    // MariaDB instances
    try {
      const mariadbConfDir = '/etc/mysql-instances';
      if (fs.existsSync(mariadbConfDir)) {
        const instanceConfigs = fs.readdirSync(mariadbConfDir).filter(f => f.endsWith('.cnf'));
        for (const configFile of instanceConfigs) {
          const instanceName = configFile.replace('.cnf', '');
          const serviceName = `mariadb-${instanceName}`;

          // Get port and instance type from config
          let port = 'N/A';
          let instanceType = 'standalone';
          try {
            const configContent = fs.readFileSync(path.join(mariadbConfDir, configFile), 'utf8');
            const portMatch = configContent.match(/port\s*=\s*(\d+)/);
            if (portMatch) port = portMatch[1];
            // Check for replication settings
            if (configContent.includes('log-bin') || configContent.includes('server-id')) {
              if (configContent.includes('read_only') && configContent.match(/read_only\s*=\s*(1|ON|true)/i)) {
                instanceType = 'slave';
              } else {
                instanceType = 'master';
              }
            }
          } catch (e) {}

          let state = 'stopped';
          let cpu = '0.0';
          let memory = 0;
          let uptime = '0 minutes';
          try {
            const statusOutput = execSync(`systemctl is-active ${serviceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
            if (statusOutput === 'active') {
              state = 'running';
              try {
                const pidOutput = execSync(`systemctl show ${serviceName} -p MainPID --value 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim();
                if (pidOutput && pidOutput !== '0') {
                  const psOutput = execSync(`ps -p ${pidOutput} -o %cpu,%mem,etimes --no-headers 2>/dev/null || echo "0 0 0"`, { encoding: 'utf8' }).trim();
                  const [cpuVal, memVal, etimes] = psOutput.split(/\s+/);
                  cpu = (parseFloat(cpuVal) || 0).toFixed(1);
                  memory = parseFloat(memVal) || 0;
                  uptime = humanizeTime(parseInt(etimes) || 0);
                }
              } catch (e) {}
            }
          } catch (e) {}

          dbInstanceServices.push({
            name: serviceName,
            state,
            description: `MariaDB instance: ${instanceName} (port ${port})`,
            uptime,
            uptimeSeconds: 0,
            cpu,
            memory,
            isDbInstance: true,
            dbType: 'mariadb',
            instanceName,
            instanceType
          });
        }
      }
    } catch (e) {
      console.error('Failed to get MariaDB instances:', e);
    }

    // PostgreSQL instances
    try {
      const pgsqlConfDir = '/etc/postgresql-instances';
      if (fs.existsSync(pgsqlConfDir)) {
        const instanceDirs = fs.readdirSync(pgsqlConfDir).filter(f => {
          const stat = fs.statSync(path.join(pgsqlConfDir, f));
          return stat.isDirectory();
        });
        for (const instanceName of instanceDirs) {
          const serviceName = `postgresql-${instanceName}`;

          // Get port and instance type from config
          let port = 'N/A';
          let instanceType = 'standalone';
          try {
            const confFile = path.join(pgsqlConfDir, instanceName, 'postgresql.conf');
            if (fs.existsSync(confFile)) {
              const configContent = fs.readFileSync(confFile, 'utf8');
              const portMatch = configContent.match(/^port\s*=\s*(\d+)/m);
              if (portMatch) port = portMatch[1];
              // Check for replication settings
              if (configContent.includes('primary_conninfo') || configContent.includes('hot_standby')) {
                instanceType = 'standby';
              } else if (configContent.includes('wal_level') && configContent.match(/wal_level\s*=\s*('?replica'?|'?logical'?)/i)) {
                instanceType = 'primary';
              }
            }
            // Also check recovery.conf or standby.signal
            const recoveryFile = path.join(pgsqlConfDir, instanceName, 'recovery.conf');
            const standbySignal = path.join(pgsqlConfDir, instanceName, 'standby.signal');
            if (fs.existsSync(recoveryFile) || fs.existsSync(standbySignal)) {
              instanceType = 'standby';
            }
          } catch (e) {}

          let state = 'stopped';
          let cpu = '0.0';
          let memory = 0;
          let uptime = '0 minutes';
          try {
            const statusOutput = execSync(`systemctl is-active ${serviceName} 2>/dev/null || true`, { encoding: 'utf8' }).trim();
            if (statusOutput === 'active') {
              state = 'running';
              try {
                const pidOutput = execSync(`systemctl show ${serviceName} -p MainPID --value 2>/dev/null || echo 0`, { encoding: 'utf8' }).trim();
                if (pidOutput && pidOutput !== '0') {
                  const psOutput = execSync(`ps -p ${pidOutput} -o %cpu,%mem,etimes --no-headers 2>/dev/null || echo "0 0 0"`, { encoding: 'utf8' }).trim();
                  const [cpuVal, memVal, etimes] = psOutput.split(/\s+/);
                  cpu = (parseFloat(cpuVal) || 0).toFixed(1);
                  memory = parseFloat(memVal) || 0;
                  uptime = humanizeTime(parseInt(etimes) || 0);
                }
              } catch (e) {}
            }
          } catch (e) {}

          dbInstanceServices.push({
            name: serviceName,
            state,
            description: `PostgreSQL instance: ${instanceName} (port ${port})`,
            uptime,
            uptimeSeconds: 0,
            cpu,
            memory,
            isDbInstance: true,
            dbType: 'postgresql',
            instanceName,
            instanceType
          });
        }
      }
    } catch (e) {
      console.error('Failed to get PostgreSQL instances:', e);
    }

    // Combine all services
    const allServices = [...services, ...dbInstanceServices].sort((a, b) => a.name.localeCompare(b.name));

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
      services: allServices
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
    let fileManager = false;
    try {
      const hestiaConf = path.join(HESTIA_DIR, 'conf/hestia.conf');
      if (fs.existsSync(hestiaConf)) {
        const conf = fs.readFileSync(hestiaConf, 'utf8');
        // Match FILE_MANAGER='yes' or FILE_MANAGER="yes" or FILE_MANAGER=yes (with or without quotes)
        // The regex needs to handle any characters before line end
        const fmMatch = conf.match(/^FILE_MANAGER=['"]?(yes|no|true|false)['"]?/mi);
        if (fmMatch) {
          const val = fmMatch[1].toLowerCase();
          fileManager = val === 'yes' || val === 'true';
        }
      }
    } catch (e) {
      console.error('Failed to read FILE_MANAGER config:', e);
    }

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
    const configData = await execHestiaJson('v-list-sys-config', []);
    const config = configData.config || configData; // Handle both {config: {...}} and flat structure

    // Get system info for hostname/timezone
    const sysInfoData = await execHestiaJson('v-list-sys-info', []);
    const sysInfo = sysInfoData.sysinfo || sysInfoData;
    
    // Get PHP versions - list all available versions and check if installed
    let phpVersions = [];
    try {
      // All PHP versions that can be managed
      const allPhpVersions = ['5.6', '7.0', '7.1', '7.2', '7.3', '7.4', '8.0', '8.1', '8.2', '8.3', '8.4'];
      const phpDir = '/etc/php';
      const installedVersions = new Set();

      // Check which versions are installed by looking at /etc/php directory
      if (fs.existsSync(phpDir)) {
        const dirs = fs.readdirSync(phpDir).filter(f => /^\d+\.\d+$/.test(f));
        dirs.forEach(v => installedVersions.add(v));
      }

      // Also check via dpkg for more accurate detection
      try {
        const dpkgOutput = execSync('dpkg -l | grep "php[0-9]" | awk \'{print $2}\' | grep -oP "[0-9]+\\.[0-9]+" | sort -u', { encoding: 'utf8' });
        dpkgOutput.trim().split('\n').filter(v => v).forEach(v => installedVersions.add(v));
      } catch (e) {}

      phpVersions = allPhpVersions.map(v => {
        const installed = installedVersions.has(v);
        // Check domains using this version requires iterating users, simplified for now
        return { version: v, installed, domains: [] };
      });
    } catch (e) {
      console.error('Error getting PHP versions:', e);
    }

    // Get timezones
    let timezones = [];
    try {
      const tzOutput = execSync('timedatectl list-timezones 2>/dev/null || cat /usr/share/zoneinfo/zone.tab | awk \'{print $3}\' | grep -v "^#" | sort', { encoding: 'utf8' });
      timezones = tzOutput.trim().split('\n').filter(tz => tz && !tz.startsWith('#'));
    } catch (e) {
      // Fallback to common timezones
      timezones = ['UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Singapore', 'Asia/Ho_Chi_Minh', 'Australia/Sydney'];
    }

    // Helper to check if a value is truthy (handles "yes", "true", "1", true)
    const isTruthy = (val) => {
      const strVal = String(val).toLowerCase().trim();
      return strVal === 'yes' || strVal === 'true' || strVal === '1';
    };

    // Check database systems
    const dbSystem = config.DB_SYSTEM || '';
    const mysqlEnabled = dbSystem.includes('mysql') || dbSystem.includes('mariadb');
    const pgsqlEnabled = dbSystem.includes('pgsql') || dbSystem.includes('postgres');
    const mongodbEnabled = config.MONGODB_SYSTEM === 'yes' || isTruthy(config.MONGODB_SYSTEM);

    // Get SSL certificate info
    let sslInfo = {};
    try {
      const sslData = await execHestiaJson('v-list-sys-hestia-ssl', []);
      sslInfo = sslData || {};
    } catch (e) {
      console.error('Failed to get SSL info:', e);
    }

    res.json({
      hostname: sysInfo?.HOSTNAME || 'Unknown',
      timezone: sysInfo?.TIMEZONE || 'UTC',
      timezones: timezones,
      config: {
        version: config.VERSION,
        releaseBranch: config.RELEASE_BRANCH,
        theme: config.THEME,
        language: config.LANGUAGE,
        debugMode: isTruthy(config.DEBUG_MODE),
        webSystem: config.WEB_SYSTEM,
        webBackend: config.WEB_BACKEND,
        dnsSystem: config.DNS_SYSTEM,
        mailSystem: config.MAIL_SYSTEM,
        antivirusSystem: config.ANTIVIRUS_SYSTEM,
        antispamSystem: config.ANTISPAM_SYSTEM,
        webmailSystem: config.WEBMAIL_SYSTEM,
        ftpSystem: config.FTP_SYSTEM,
        webmailAlias: config.WEBMAIL_ALIAS,
        dbPmaAlias: config.DB_PMA_ALIAS,
        dbPgaAlias: config.DB_PGA_ALIAS,
        inactiveSessionTimeout: config.INACTIVE_SESSION_TIMEOUT,
        loginStyle: config.LOGIN_STYLE,
        api: config.API,
        apiSystem: config.API_SYSTEM,
        policySystemPasswordReset: config.POLICY_SYSTEM_PASSWORD_RESET,
        policyUserChangeTheme: config.POLICY_USER_CHANGE_THEME,
        fileManager: isTruthy(config.FILE_MANAGER),
        webTerminal: isTruthy(config.WEB_TERMINAL),
        pluginAppInstaller: isTruthy(config.PLUGIN_APP_INSTALLER),
        diskQuota: config.DISK_QUOTA,
        resourcesLimit: config.RESOURCES_LIMIT,
        firewallSystem: config.FIREWALL_SYSTEM,
        upgradeSendEmail: isTruthy(config.UPGRADE_SEND_EMAIL),
        upgradeSendEmailLog: isTruthy(config.UPGRADE_SEND_EMAIL_LOG),
        smtpRelay: isTruthy(config.SMTP_RELAY),
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
      mysql: { enabled: mysqlEnabled },
      pgsql: { enabled: pgsqlEnabled },
      mongodb: { enabled: mongodbEnabled },
      ssl: {
        CRT: sslInfo.CRT || '',
        KEY: sslInfo.KEY || '',
        SUBJECT: sslInfo.SUBJECT,
        NOT_BEFORE: sslInfo.NOT_BEFORE,
        NOT_AFTER: sslInfo.NOT_AFTER,
        SIGNATURE: sslInfo.SIGNATURE,
        KEY_SIZE: sslInfo.PUB_KEY,
        ISSUER: sslInfo.ISSUER
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
  try {
    const { feature, enabled } = req.body;

    // Map feature names to hestia commands
    const featureCommands = {
      'filemanager': enabled ? 'v-add-sys-filemanager' : 'v-delete-sys-filemanager',
      'webTerminal': enabled ? 'v-add-sys-web-terminal' : 'v-delete-sys-web-terminal',
      'appInstaller': enabled ? 'v-add-sys-quick-install' : 'v-delete-sys-quick-install',
      'firewall': enabled ? 'v-add-sys-firewall' : 'v-delete-sys-firewall',
      'quota': enabled ? 'v-add-sys-quota' : 'v-delete-sys-quota',
      'cgroups': enabled ? 'v-add-sys-cgroups' : 'v-delete-sys-cgroups',
    };

    const cmd = featureCommands[feature];
    if (!cmd) {
      return res.status(400).json({ error: `Unknown feature: ${feature}` });
    }

    try {
      await execHestia(cmd, []);
    } catch (cmdError) {
      // Some commands return non-zero exit code if the component is already in the desired state
      // e.g., "File Manager components are not installed." when trying to delete
      // or "already installed" when trying to add
      // Treat these as success since the end state matches what user wanted
      const errorMsg = cmdError.message.toLowerCase();
      const isAlreadyInState =
        errorMsg.includes('not installed') ||
        errorMsg.includes('already installed') ||
        errorMsg.includes('already enabled') ||
        errorMsg.includes('already disabled') ||
        errorMsg.includes('is not') ||
        errorMsg.includes('already');

      if (!isAlreadyInState) {
        throw cmdError;
      }
      // Otherwise, it's already in the desired state, treat as success
      console.log(`Feature ${feature} toggle: already in desired state (${enabled ? 'enabled' : 'disabled'})`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Toggle feature error:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle feature' });
  }
});

router.post('/server/config/php', adminMiddleware, async (req, res) => {
  const { version, action } = req.body;

  if (!version || !action) {
    return res.status(400).json({ error: 'Version and action are required' });
  }

  // Validate version format
  if (!/^\d+\.\d+$/.test(version)) {
    return res.status(400).json({ error: 'Invalid PHP version format' });
  }

  // Validate action
  if (!['install', 'uninstall'].includes(action)) {
    return res.status(400).json({ error: 'Action must be install or uninstall' });
  }

  try {
    if (action === 'install') {
      // Install PHP-FPM for this version
      await execHestia('v-add-sys-phpfpm', [version], { timeout: 600000 }); // 10 min timeout
    } else {
      // Uninstall PHP-FPM for this version
      await execHestia('v-delete-sys-phpfpm', [version], { timeout: 300000 }); // 5 min timeout
    }
    res.json({ success: true });
  } catch (error) {
    console.error(`PHP ${action} error:`, error);
    res.status(500).json({ error: error.message || `Failed to ${action} PHP ${version}` });
  }
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

/**
 * GET /api/system/hestia-config
 * Read hestia.conf file
 */
router.get('/hestia-config', adminMiddleware, async (req, res) => {
  try {
    const configPath = path.join(HESTIA_DIR, 'conf/hestia.conf');

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: 'Configuration file not found' });
    }

    const content = fs.readFileSync(configPath, 'utf8');
    res.json({ content, path: configPath });
  } catch (error) {
    console.error('Read hestia.conf error:', error);
    res.status(500).json({ error: error.message || 'Failed to read configuration' });
  }
});

/**
 * POST /api/system/hestia-config
 * Write hestia.conf file
 */
router.post('/hestia-config', adminMiddleware, async (req, res) => {
  try {
    const { content } = req.body;

    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required' });
    }

    const configPath = path.join(HESTIA_DIR, 'conf/hestia.conf');

    // Create backup
    const backupPath = `${configPath}.backup.${Date.now()}`;
    if (fs.existsSync(configPath)) {
      fs.copyFileSync(configPath, backupPath);
    }

    // Write new config
    fs.writeFileSync(configPath, content, 'utf8');

    res.json({ success: true, backup: backupPath });
  } catch (error) {
    console.error('Write hestia.conf error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/system/restart-hestia
 * Restart HestiaCP services
 */
router.post('/restart-hestia', adminMiddleware, async (req, res) => {
  try {
    // Restart Hestia backend service
    exec('systemctl restart hestia', (error) => {
      if (error) {
        console.error('Restart hestia error:', error);
      }
    });

    res.json({ success: true, message: 'HestiaCP restart initiated' });
  } catch (error) {
    console.error('Restart hestia error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart HestiaCP' });
  }
});

/**
 * GET /api/system/user-stats
 * Get stats for current user (or admin overview)
 */
router.get('/user-stats', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const isAdmin = req.user?.role === 'admin';
    const userDataDir = path.join(HESTIA_DIR, 'data/users', username);

    // Parse user.conf to get quota info
    let userConf = {};
    try {
      const userConfPath = path.join(userDataDir, 'user.conf');
      if (fs.existsSync(userConfPath)) {
        const content = fs.readFileSync(userConfPath, 'utf8');
        content.split('\n').forEach(line => {
          const match = line.match(/^([A-Z_]+)='?([^']*)'?$/);
          if (match) {
            userConf[match[1]] = match[2];
          }
        });
      }
    } catch (e) {
      console.error('Error reading user.conf:', e);
    }

    // Count web domains from web.conf
    let webDomains = 0;
    try {
      const webConfPath = path.join(userDataDir, 'web.conf');
      if (fs.existsSync(webConfPath)) {
        const content = fs.readFileSync(webConfPath, 'utf8');
        const matches = content.match(/^DOMAIN=/gm);
        webDomains = matches ? matches.length : 0;
      }
    } catch (e) {}

    // Count HAProxy domains from haproxy.json
    let haproxyDomains = 0;
    try {
      const haproxyJsonPath = path.join(userDataDir, 'haproxy.json');
      if (fs.existsSync(haproxyJsonPath)) {
        const haproxyData = JSON.parse(fs.readFileSync(haproxyJsonPath, 'utf8'));
        haproxyDomains = (haproxyData.domains || []).length;
      }
    } catch (e) {}

    // Count databases - need to count from all instances
    let databases = {
      mysql: 0,
      pgsql: 0,
      mongo: 0,
      total: 0
    };
    try {
      // MySQL/MariaDB databases from db.conf
      const dbConfPath = path.join(userDataDir, 'db.conf');
      if (fs.existsSync(dbConfPath)) {
        const content = fs.readFileSync(dbConfPath, 'utf8');
        const matches = content.match(/^DB=/gm);
        databases.mysql = matches ? matches.length : 0;
      }

      // PostgreSQL databases from pgsql.conf
      const pgsqlConfPath = path.join(userDataDir, 'pgsql.conf');
      if (fs.existsSync(pgsqlConfPath)) {
        const content = fs.readFileSync(pgsqlConfPath, 'utf8');
        const matches = content.match(/^DB=/gm);
        databases.pgsql = matches ? matches.length : 0;
      }

      // MongoDB databases - check mongo.conf or similar
      const mongoConfPath = path.join(userDataDir, 'mongo.conf');
      if (fs.existsSync(mongoConfPath)) {
        const content = fs.readFileSync(mongoConfPath, 'utf8');
        const matches = content.match(/^DB=/gm);
        databases.mongo = matches ? matches.length : 0;
      }

      databases.total = databases.mysql + databases.pgsql + databases.mongo;
    } catch (e) {}

    // Count mail domains from mail.conf
    let mailDomains = 0;
    try {
      const mailConfPath = path.join(userDataDir, 'mail.conf');
      if (fs.existsSync(mailConfPath)) {
        const content = fs.readFileSync(mailConfPath, 'utf8');
        const matches = content.match(/^DOMAIN=/gm);
        mailDomains = matches ? matches.length : 0;
      }
    } catch (e) {}

    // Count DNS domains from dns.conf
    let dnsDomains = 0;
    try {
      const dnsConfPath = path.join(userDataDir, 'dns.conf');
      if (fs.existsSync(dnsConfPath)) {
        const content = fs.readFileSync(dnsConfPath, 'utf8');
        const matches = content.match(/^DOMAIN=/gm);
        dnsDomains = matches ? matches.length : 0;
      }
    } catch (e) {}

    // Count cron jobs from cron.conf
    let cronJobs = 0;
    try {
      const cronConfPath = path.join(userDataDir, 'cron.conf');
      if (fs.existsSync(cronConfPath)) {
        const content = fs.readFileSync(cronConfPath, 'utf8');
        const matches = content.match(/^JOB=/gm);
        cronJobs = matches ? matches.length : 0;
      }
    } catch (e) {}

    // Count backups
    let backups = 0;
    try {
      const backupDir = path.join('/backup', username);
      if (fs.existsSync(backupDir)) {
        const files = fs.readdirSync(backupDir).filter(f => f.endsWith('.tar') || f.endsWith('.tar.gz'));
        backups = files.length;
      }
    } catch (e) {}

    // Get total users count (admin only)
    let totalUsers = 0;
    if (isAdmin) {
      try {
        const usersDir = path.join(HESTIA_DIR, 'data/users');
        const users = fs.readdirSync(usersDir).filter(f => {
          const stat = fs.statSync(path.join(usersDir, f));
          return stat.isDirectory() && fs.existsSync(path.join(usersDir, f, 'user.conf'));
        });
        totalUsers = users.length;
      } catch (e) {}
    }

    // Disk and bandwidth usage from user.conf
    const diskUsed = userConf.U_DISK || '0';
    const diskQuota = userConf.DISK_QUOTA || 'unlimited';
    const bandwidthUsed = userConf.U_BANDWIDTH || '0';
    const bandwidthQuota = userConf.BANDWIDTH || 'unlimited';

    res.json({
      webDomains,
      haproxyDomains,
      databases,
      mailDomains,
      dnsDomains,
      cronJobs,
      backups,
      totalUsers,
      isAdmin,
      disk: {
        used: diskUsed,
        quota: diskQuota
      },
      bandwidth: {
        used: bandwidthUsed,
        quota: bandwidthQuota
      }
    });
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

/**
 * GET /api/system/update/status
 * Get VHestiaCP update status
 */
router.get('/update/status', adminMiddleware, async (req, res) => {
  try {
    // Get update check result
    const output = await execHestia('v-check-vhestiacp-update', ['json']);
    let updateInfo = {};
    try {
      updateInfo = JSON.parse(output);
    } catch (e) {
      console.error('Failed to parse update info:', e);
    }

    // Get auto-update setting from hestia.conf (read directly from file)
    let autoUpdate = false;
    try {
      const configPath = path.join(HESTIA_DIR, 'conf/hestia.conf');
      if (fs.existsSync(configPath)) {
        const configContent = fs.readFileSync(configPath, 'utf8');
        const match = configContent.match(/VHESTIA_AUTO_UPDATE=['"]*([^'"'\n]+)['"']*/);
        if (match) {
          autoUpdate = match[1] === 'true' || match[1] === 'yes';
        }
      }
    } catch (e) {}

    // Get update logs
    let updateLogs = [];
    try {
      const logsDir = path.join(HESTIA_DIR, 'log/updates');
      if (fs.existsSync(logsDir)) {
        const files = fs.readdirSync(logsDir)
          .filter(f => f.startsWith('update_') && f.endsWith('.log'))
          .sort()
          .reverse()
          .slice(0, 10); // Last 10 update logs

        updateLogs = files.map(f => ({
          name: f,
          date: f.replace('update_', '').replace('.log', ''),
          path: path.join(logsDir, f)
        }));
      }
    } catch (e) {}

    res.json({
      ...updateInfo,
      autoUpdate,
      updateLogs
    });
  } catch (error) {
    console.error('Get update status error:', error);
    res.status(500).json({ error: 'Failed to get update status' });
  }
});

/**
 * POST /api/system/update/check
 * Force check for updates
 */
router.post('/update/check', adminMiddleware, async (req, res) => {
  try {
    const output = await execHestia('v-check-vhestiacp-update', ['json']);
    let updateInfo = {};
    try {
      updateInfo = JSON.parse(output);
    } catch (e) {
      console.error('Failed to parse update info:', e);
    }
    res.json(updateInfo);
  } catch (error) {
    console.error('Check update error:', error);
    res.status(500).json({ error: 'Failed to check for updates' });
  }
});

/**
 * POST /api/system/update/install
 * Install available update
 */
router.post('/update/install', adminMiddleware, async (req, res) => {
  try {
    const { force } = req.body;
    const args = force ? ['force'] : [];

    // Run update with longer timeout (10 minutes)
    const output = await execHestia('v-update-sys-vhestiacp', args, { timeout: 600000 });

    res.json({
      success: true,
      message: 'Update completed successfully',
      output
    });
  } catch (error) {
    console.error('Install update error:', error);
    res.status(500).json({ error: error.message || 'Failed to install update' });
  }
});

/**
 * PUT /api/system/update/auto-update
 * Enable/disable auto-update
 */
router.put('/update/auto-update', adminMiddleware, async (req, res) => {
  try {
    const { enabled } = req.body;
    const value = enabled ? 'true' : 'false';

    await execHestia('v-change-sys-config-value', ['VHESTIA_AUTO_UPDATE', value]);

    // Set up or remove cron job
    if (enabled) {
      // Add daily cron job for update check (at 3 AM)
      try {
        const cronCmd = `0 3 * * * root ${HESTIA_DIR}/bin/v-update-sys-vhestiacp-cron`;
        const cronFile = '/etc/cron.d/vhestiacp-update';
        fs.writeFileSync(cronFile, `# VHestiaCP auto-update check\n${cronCmd}\n`, 'utf8');
      } catch (e) {
        console.error('Failed to create cron job:', e);
      }
    } else {
      // Remove cron job
      try {
        const cronFile = '/etc/cron.d/vhestiacp-update';
        if (fs.existsSync(cronFile)) {
          fs.unlinkSync(cronFile);
        }
      } catch (e) {
        console.error('Failed to remove cron job:', e);
      }
    }

    res.json({ success: true, autoUpdate: enabled });
  } catch (error) {
    console.error('Set auto-update error:', error);
    res.status(500).json({ error: 'Failed to set auto-update' });
  }
});

/**
 * GET /api/system/update/log/:name
 * Get specific update log content
 */
router.get('/update/log/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;

    // Validate filename to prevent path traversal
    if (!/^update_\d{8}_\d{6}\.log$/.test(name)) {
      return res.status(400).json({ error: 'Invalid log file name' });
    }

    const logPath = path.join(HESTIA_DIR, 'log/updates', name);

    if (!fs.existsSync(logPath)) {
      return res.status(404).json({ error: 'Log file not found' });
    }

    const content = fs.readFileSync(logPath, 'utf8');
    res.json({ name, content });
  } catch (error) {
    console.error('Get update log error:', error);
    res.status(500).json({ error: 'Failed to get update log' });
  }
});

export default router;
