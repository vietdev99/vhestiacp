import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(adminMiddleware);

/**
 * GET /api/mariadb/config
 * Get MariaDB configuration and status
 */
router.get('/config', async (req, res) => {
  try {
    // Get MariaDB status
    let status = 'stopped';
    let version = 'Unknown';

    try {
      execSync('systemctl is-active mariadb', { encoding: 'utf8' });
      status = 'running';
    } catch {
      // Try mysql service name
      try {
        execSync('systemctl is-active mysql', { encoding: 'utf8' });
        status = 'running';
      } catch {
        status = 'stopped';
      }
    }

    // Get MariaDB version
    try {
      const versionOutput = execSync('mysql --version 2>&1', { encoding: 'utf8' });
      const match = versionOutput.match(/(\d+\.\d+\.\d+)/);
      if (match) version = match[1];
    } catch (e) {
      // Ignore
    }

    // Read main config file
    let config = '';
    const configPaths = [
      '/etc/mysql/mariadb.conf.d/50-server.cnf',
      '/etc/mysql/my.cnf',
      '/etc/my.cnf'
    ];
    let configPath = null;

    for (const p of configPaths) {
      if (fs.existsSync(p)) {
        try {
          config = fs.readFileSync(p, 'utf8');
          configPath = p;
          break;
        } catch {
          // Try next
        }
      }
    }

    // Parse replication settings
    const settings = parseMariaDBConfig(config);

    // Check replication status if enabled
    let replicationStatus = null;
    if (settings.replicationMode !== 'standalone') {
      replicationStatus = await getReplicationStatus();
    }

    res.json({
      status,
      version,
      configPath,
      config,
      settings,
      replicationStatus
    });
  } catch (error) {
    console.error('Get MariaDB config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get MariaDB config' });
  }
});

/**
 * POST /api/mariadb/config
 * Save MariaDB configuration
 */
router.post('/config', async (req, res) => {
  try {
    const { config, configPath = '/etc/mysql/mariadb.conf.d/50-server.cnf', restart } = req.body;

    // Backup current config
    const backupPath = `${configPath}.backup.${Date.now()}`;
    try {
      if (fs.existsSync(configPath)) {
        fs.copyFileSync(configPath, backupPath);
      }
    } catch {
      // No existing config to backup
    }

    // Write new config
    fs.writeFileSync(configPath, config, 'utf8');

    // Restart service if requested
    if (restart) {
      exec('systemctl restart mariadb || systemctl restart mysql', (error) => {
        if (error) {
          console.error('Restart mariadb error:', error);
        }
      });
    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Save MariaDB config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/mariadb/replication/setup
 * Setup replication (master-slave or master-master)
 */
router.post('/replication/setup', async (req, res) => {
  try {
    const {
      mode, // 'master-slave' or 'master-master'
      role, // 'master' or 'slave'
      serverId,
      masterHost,
      masterPort = 3306,
      replicationUser = 'repl',
      replicationPassword,
      binlogFormat = 'ROW'
    } = req.body;

    if (!mode || !role || !serverId) {
      return res.status(400).json({ error: 'Mode, role, and server ID are required' });
    }

    // Generate config for replication
    const replicationConfig = generateReplicationConfig({
      mode,
      role,
      serverId,
      binlogFormat
    });

    // Get current config path
    const configPath = '/etc/mysql/mariadb.conf.d/60-replication.cnf';

    // Write replication config
    fs.writeFileSync(configPath, replicationConfig, 'utf8');

    // If this is a master, create replication user
    if (role === 'master' && replicationPassword) {
      const createUserSQL = `
        CREATE USER IF NOT EXISTS '${replicationUser}'@'%' IDENTIFIED BY '${replicationPassword}';
        GRANT REPLICATION SLAVE ON *.* TO '${replicationUser}'@'%';
        FLUSH PRIVILEGES;
      `;

      try {
        execSync(`mysql -e "${createUserSQL}"`, { encoding: 'utf8' });
      } catch (e) {
        console.error('Failed to create replication user:', e);
      }
    }

    // Restart to apply config
    exec('systemctl restart mariadb || systemctl restart mysql', (error, stdout, stderr) => {
      if (error) {
        return res.status(500).json({ error: stderr || 'Failed to restart MariaDB' });
      }

      res.json({
        success: true,
        message: 'Replication configuration applied. Server restarted.',
        nextSteps: role === 'slave' ? [
          'Configure slave to connect to master using the slave status command',
          'Run CHANGE MASTER TO command with master details'
        ] : [
          'Note the binary log position for slave configuration',
          'Configure slaves to connect to this master'
        ]
      });
    });
  } catch (error) {
    console.error('Setup replication error:', error);
    res.status(500).json({ error: error.message || 'Failed to setup replication' });
  }
});

/**
 * GET /api/mariadb/replication/status
 * Get replication status
 */
router.get('/replication/status', async (req, res) => {
  try {
    const status = await getReplicationStatus();
    res.json(status);
  } catch (error) {
    console.error('Get replication status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get replication status' });
  }
});

/**
 * POST /api/mariadb/replication/start-slave
 * Start slave replication
 */
router.post('/replication/start-slave', async (req, res) => {
  try {
    const {
      masterHost,
      masterPort = 3306,
      masterUser,
      masterPassword,
      masterLogFile,
      masterLogPos
    } = req.body;

    if (!masterHost || !masterUser || !masterPassword) {
      return res.status(400).json({ error: 'Master host, user, and password are required' });
    }

    // Stop slave first
    try {
      execSync('mysql -e "STOP SLAVE;"', { encoding: 'utf8' });
    } catch {
      // Ignore if not running
    }

    // Build CHANGE MASTER TO command
    let changeMasterSQL = `
      CHANGE MASTER TO
        MASTER_HOST='${masterHost}',
        MASTER_PORT=${masterPort},
        MASTER_USER='${masterUser}',
        MASTER_PASSWORD='${masterPassword}'
    `;

    if (masterLogFile && masterLogPos) {
      changeMasterSQL += `,
        MASTER_LOG_FILE='${masterLogFile}',
        MASTER_LOG_POS=${masterLogPos}
      `;
    }

    changeMasterSQL += ';';

    // Execute CHANGE MASTER TO
    execSync(`mysql -e "${changeMasterSQL}"`, { encoding: 'utf8' });

    // Start slave
    execSync('mysql -e "START SLAVE;"', { encoding: 'utf8' });

    // Get status
    const status = await getReplicationStatus();

    res.json({
      success: true,
      message: 'Slave replication started',
      status
    });
  } catch (error) {
    console.error('Start slave error:', error);
    res.status(500).json({ error: error.message || 'Failed to start slave replication' });
  }
});

/**
 * POST /api/mariadb/replication/stop-slave
 * Stop slave replication
 */
router.post('/replication/stop-slave', async (req, res) => {
  try {
    execSync('mysql -e "STOP SLAVE;"', { encoding: 'utf8' });
    res.json({ success: true, message: 'Slave replication stopped' });
  } catch (error) {
    console.error('Stop slave error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop slave' });
  }
});

/**
 * GET /api/mariadb/master-status
 * Get master binary log status (for slave configuration)
 */
router.get('/master-status', async (req, res) => {
  try {
    const output = execSync('mysql -e "SHOW MASTER STATUS\\G"', { encoding: 'utf8' });

    const status = {
      file: null,
      position: null
    };

    const fileMatch = output.match(/File:\s*(\S+)/);
    const posMatch = output.match(/Position:\s*(\d+)/);

    if (fileMatch) status.file = fileMatch[1];
    if (posMatch) status.position = parseInt(posMatch[1]);

    res.json(status);
  } catch (error) {
    console.error('Get master status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get master status' });
  }
});

/**
 * Helper: Get replication status
 */
async function getReplicationStatus() {
  const status = {
    isMaster: false,
    isSlave: false,
    masterStatus: null,
    slaveStatus: null
  };

  try {
    // Check master status
    const masterOutput = execSync('mysql -e "SHOW MASTER STATUS\\G" 2>/dev/null || true', { encoding: 'utf8' });
    if (masterOutput.includes('File:')) {
      status.isMaster = true;
      status.masterStatus = {
        file: masterOutput.match(/File:\s*(\S+)/)?.[1],
        position: parseInt(masterOutput.match(/Position:\s*(\d+)/)?.[1] || 0)
      };
    }
  } catch {
    // Not configured as master
  }

  try {
    // Check slave status
    const slaveOutput = execSync('mysql -e "SHOW SLAVE STATUS\\G" 2>/dev/null || true', { encoding: 'utf8' });
    if (slaveOutput.includes('Slave_IO_Running:')) {
      status.isSlave = true;
      status.slaveStatus = {
        masterHost: slaveOutput.match(/Master_Host:\s*(\S+)/)?.[1],
        slaveIORunning: slaveOutput.match(/Slave_IO_Running:\s*(\S+)/)?.[1] === 'Yes',
        slaveSQLRunning: slaveOutput.match(/Slave_SQL_Running:\s*(\S+)/)?.[1] === 'Yes',
        secondsBehindMaster: parseInt(slaveOutput.match(/Seconds_Behind_Master:\s*(\d+)/)?.[1] || 0),
        lastError: slaveOutput.match(/Last_Error:\s*(.+)$/m)?.[1]?.trim() || null
      };
    }
  } catch {
    // Not configured as slave
  }

  return status;
}

/**
 * Helper: Parse MariaDB config
 */
function parseMariaDBConfig(config) {
  const settings = {
    replicationMode: 'standalone',
    serverId: null,
    binlogFormat: 'ROW',
    logBin: false
  };

  if (!config) return settings;

  // Check for server-id (indicates replication is configured)
  const serverIdMatch = config.match(/server[_-]id\s*=\s*(\d+)/i);
  if (serverIdMatch) {
    settings.serverId = parseInt(serverIdMatch[1]);
  }

  // Check for log_bin
  if (config.match(/log[_-]bin\s*=/i)) {
    settings.logBin = true;
    settings.replicationMode = 'master';
  }

  // Check binlog format
  const binlogMatch = config.match(/binlog[_-]format\s*=\s*(\w+)/i);
  if (binlogMatch) {
    settings.binlogFormat = binlogMatch[1].toUpperCase();
  }

  return settings;
}

/**
 * Helper: Generate replication config
 */
function generateReplicationConfig({ mode, role, serverId, binlogFormat = 'ROW' }) {
  let config = `# MariaDB Replication Configuration
# Generated by VHestiaCP
# Mode: ${mode}, Role: ${role}

[mysqld]
server-id = ${serverId}
`;

  if (role === 'master' || mode === 'master-master') {
    config += `
# Binary logging for replication
log_bin = /var/log/mysql/mariadb-bin
binlog_format = ${binlogFormat}
expire_logs_days = 7
max_binlog_size = 100M

# Sync binlog for durability
sync_binlog = 1
`;
  }

  if (role === 'slave' || mode === 'master-master') {
    config += `
# Relay log for slave
relay_log = /var/log/mysql/relay-bin
relay_log_index = /var/log/mysql/relay-bin.index

# Read-only for slaves (optional, remove for master-master)
${mode === 'master-master' ? '# ' : ''}read_only = 1

# Skip slave start on startup (manual start for safety)
skip-slave-start = 1
`;
  }

  if (mode === 'master-master') {
    config += `
# Master-Master specific settings
auto_increment_increment = 2
auto_increment_offset = ${serverId}

# Allow writes on slave (for master-master)
read_only = 0
`;
  }

  return config;
}

// ============================================================
// MariaDB Instance Management (Multi-Instance Support)
// ============================================================

const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';
const INSTANCES_DATA_DIR = '/var/lib/mysql-instances';
const INSTANCES_CONF_DIR = '/etc/mysql-instances';

/**
 * GET /api/mariadb/instances
 * List all MariaDB instances
 */
router.get('/instances', async (req, res) => {
  try {
    let output;
    try {
      output = execSync(`${HESTIA_DIR}/bin/v-list-mariadb-instances json`, { 
        encoding: 'utf8',
        timeout: 30000 
      });
    } catch (e) {
      output = '{"instances": []}';
    }
    
    let data = JSON.parse(output);
    
    // Auto-create default instance if none exist
    if (!data.instances || data.instances.length === 0) {
      console.log('No MariaDB instances found, creating default...');
      try {
        execSync(`${HESTIA_DIR}/bin/v-add-mariadb-instance default 3307 standalone`, {
          encoding: 'utf8',
          timeout: 120000
        });
        // Reload instances list
        output = execSync(`${HESTIA_DIR}/bin/v-list-mariadb-instances json`, { 
          encoding: 'utf8',
          timeout: 30000 
        });
        data = JSON.parse(output);
      } catch (createError) {
        console.error('Failed to create default MariaDB instance:', createError);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('List MariaDB instances error:', error);
    // Return empty array if no instances or script fails
    res.json({ instances: [] });
  }
});

/**
 * POST /api/mariadb/instances
 * Create a new MariaDB instance
 */
router.post('/instances', async (req, res) => {
  try {
    const { name, port, dataDir } = req.body;

    // Validate inputs
    if (!name || !port) {
      return res.status(400).json({ error: 'Instance name and port are required' });
    }

    // Validate name format
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(name)) {
      return res.status(400).json({ 
        error: 'Instance name must start with a letter and contain only letters, numbers, dashes, and underscores' 
      });
    }

    // Validate port
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      return res.status(400).json({ error: 'Port must be a number between 1024 and 65535' });
    }

    // Execute create script
    const cmd = dataDir 
      ? `${HESTIA_DIR}/bin/v-add-mariadb-instance "${name}" ${portNum} "${dataDir}"`
      : `${HESTIA_DIR}/bin/v-add-mariadb-instance "${name}" ${portNum}`;
    
    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Create MariaDB instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to create instance' });
      }

      // Save instance settings if provided
      const { instanceType, masterHost, masterPort, replicationUser, replicationPassword } = req.body;
      if (instanceType) {
        try {
          const settingsDir = path.join(HESTIA_DIR, 'data/mariadb-instances');
          if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
          }
          
          const settings = {
            instanceType: instanceType || 'standalone',
            masterHost: masterHost || '',
            masterPort: masterPort || 3306,
            replicationUser: replicationUser || '',
            replicationPassword: replicationPassword || '',
            createdAt: new Date().toISOString()
          };
          
          fs.writeFileSync(
            path.join(settingsDir, `${name}-settings.json`), 
            JSON.stringify(settings, null, 2)
          );
        } catch (e) {
          console.error(`Failed to save settings for instance ${name}:`, e);
          // Don't fail the request, just log error
        }
      }

      // Read root password
      let rootPassword = '';
      try {
        const confPath = path.join(HESTIA_DIR, `conf/mariadb-${name}.conf`);
        if (fs.existsSync(confPath)) {
          const content = fs.readFileSync(confPath, 'utf8');
          const match = content.match(/ROOT_PASSWORD='([^']+)'/);
          if (match) {
            rootPassword = match[1];
          } else {
            const matchNoQuotes = content.match(/ROOT_PASSWORD=([^ \n]+)/);
            if (matchNoQuotes) rootPassword = matchNoQuotes[1];
          }
        }
      } catch (e) {}

      res.json({ success: true, message: `Instance '${name}' created successfully`, rootPassword, output: stdout });
    });
  } catch (error) {
    console.error('Create MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to create instance' });
  }
});

/**
 * GET /api/mariadb/instances/:name
 * Get instance details
 */
router.get('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get all instances and find the specific one
    const output = execSync(`${HESTIA_DIR}/bin/v-list-mariadb-instances json`, { 
      encoding: 'utf8',
      timeout: 30000 
    });
    const data = JSON.parse(output);
    const instance = data.instances?.find(i => i.name === name);
    
    if (!instance) {
      return res.status(404).json({ error: `Instance '${name}' not found` });
    }
    
    // Get config content
    let config = '';
    if (instance.configPath && fs.existsSync(instance.configPath)) {
      config = fs.readFileSync(instance.configPath, 'utf8');
    }
    
    // Load settings from JSON file for this instance
    const settingsDir = path.join(HESTIA_DIR, 'data/mariadb-instances');
    const instanceSettingsFile = path.join(settingsDir, `${name}-settings.json`);
    let settings = {};
    if (fs.existsSync(instanceSettingsFile)) {
      try {
        settings = JSON.parse(fs.readFileSync(instanceSettingsFile, 'utf8'));
      } catch (e) {
        console.error(`Failed to parse settings for instance ${name}:`, e);
      }
    }

    // Get root password from Hestia conf
    let rootPassword = '';
    const hestiaConfPath = path.join(HESTIA_DIR, `conf/mariadb-${name}.conf`);
    if (fs.existsSync(hestiaConfPath)) {
      try {
        const confContent = fs.readFileSync(hestiaConfPath, 'utf8');
        const match = confContent.match(/ROOT_PASSWORD='([^']+)'/);
        if (match) {
          rootPassword = match[1];
        } else {
            // Try without quotes
            const matchNoQuotes = confContent.match(/ROOT_PASSWORD=([^ \n]+)/);
            if (matchNoQuotes) rootPassword = matchNoQuotes[1];
        }
      } catch (e) {
        console.error(`Failed to read Hestia conf for instance ${name}:`, e);
      }
    }
    
    res.json({ ...instance, config, settings, rootPassword });
  } catch (error) {
    console.error('Get MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to get instance details' });
  }
});

/**
 * DELETE /api/mariadb/instances/:name
 * Delete an instance
 */
router.delete('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const force = req.query.force === 'true';
    
    if (name === 'default') {
      return res.status(400).json({ error: 'Cannot delete the default instance' });
    }
    
    const cmd = force 
      ? `${HESTIA_DIR}/bin/v-delete-mariadb-instance "${name}" --force`
      : `${HESTIA_DIR}/bin/v-delete-mariadb-instance "${name}"`;
    
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Delete MariaDB instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to delete instance' });
      }
      res.json({ success: true, message: `Instance '${name}' deleted successfully` });
    });
  } catch (error) {
    console.error('Delete MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete instance' });
  }
});

/**
 * POST /api/mariadb/instances/:name/config
 * Save instance configuration
 */
router.post('/instances/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const { config, restart, settings } = req.body;

    // Determine config path
    let configPath;
    if (name === 'default') {
      configPath = '/etc/mysql/mariadb.conf.d/50-server.cnf';
      if (!fs.existsSync(configPath)) {
        configPath = '/etc/mysql/my.cnf';
      }
    } else {
      configPath = `${INSTANCES_CONF_DIR}/${name}.cnf`;
    }

    // Save config file
    if (config) {
      const backupPath = `${configPath}.backup.${Date.now()}`;
      try {
        if (fs.existsSync(configPath)) {
          fs.copyFileSync(configPath, backupPath);
        }
      } catch {
        // No existing config to backup
      }
      fs.writeFileSync(configPath, config, 'utf8');
    }

    // Save settings to JSON file
    if (settings) {
      const settingsDir = path.join(HESTIA_DIR, 'data/mariadb-instances');
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      const instanceSettingsFile = path.join(settingsDir, `${name}-settings.json`);
      fs.writeFileSync(instanceSettingsFile, JSON.stringify(settings, null, 2), 'utf8');
    }

    // Restart instance if requested
    if (restart) {
      const serviceName = name === 'default' ? 'mariadb' : `mariadb-${name}`;
      exec(`systemctl restart ${serviceName} || systemctl restart mysql`, (error) => {
        if (error) {
          console.error(`Restart ${serviceName} error:`, error);
        }
      });
    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Save MariaDB instance config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/mariadb/instances/:name/start
 * Start an instance
 */
router.post('/instances/:name/start', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-start-mariadb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Start MariaDB instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to start instance' });
      }
      res.json({ success: true, message: `Instance '${name}' started successfully` });
    });
  } catch (error) {
    console.error('Start MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to start instance' });
  }
});

/**
 * POST /api/mariadb/instances/:name/stop
 * Stop an instance
 */
router.post('/instances/:name/stop', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-stop-mariadb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Stop MariaDB instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to stop instance' });
      }
      res.json({ success: true, message: `Instance '${name}' stopped successfully` });
    });
  } catch (error) {
    console.error('Stop MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop instance' });
  }
});

/**
 * POST /api/mariadb/instances/:name/restart
 * Restart an instance
 */
router.post('/instances/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-restart-mariadb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Restart MariaDB instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to restart instance' });
      }
      res.json({ success: true, message: `Instance '${name}' restarted successfully` });
    });
  } catch (error) {
    console.error('Restart MariaDB instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart instance' });
  }
});

/**
 * POST /api/mariadb/instances/check-port
 * Check if a port is available
 */
router.post('/instances/check-port', async (req, res) => {
  try {
    const { port } = req.body;
    
    if (!port) {
      return res.status(400).json({ error: 'Port is required' });
    }
    
    const portNum = parseInt(port, 10);
    if (isNaN(portNum) || portNum < 1024 || portNum > 65535) {
      return res.status(400).json({ error: 'Port must be a number between 1024 and 65535', available: false });
    }
    
    // Check if port is in use
    try {
      const output = execSync(`ss -tlnp 2>/dev/null | grep ":${portNum} " || true`, { encoding: 'utf8' });
      const inUse = output.trim().length > 0;
      res.json({ port: portNum, available: !inUse, inUse });
    } catch {
      // If ss fails, assume port is available
      res.json({ port: portNum, available: true, inUse: false });
    }
  } catch (error) {
    console.error('Check port error:', error);
    res.status(500).json({ error: error.message || 'Failed to check port' });
  }
});

/**
 * POST /api/mariadb/instances/:name/reset-password
 * Reset root password for an instance
 */
router.post('/instances/:name/reset-password', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-reset-mariadb-instance-password "${name}"`, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Reset MariaDB password error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to reset password' });
      }
      // Read new password
      let rootPassword = '';
      try {
        const confPath = path.join(HESTIA_DIR, `conf/mariadb-${name}.conf`);
        if (fs.existsSync(confPath)) {
          const content = fs.readFileSync(confPath, 'utf8');
          const match = content.match(/ROOT_PASSWORD='([^']+)'/);
          if (match) {
            rootPassword = match[1];
          } else {
            const matchNoQuotes = content.match(/ROOT_PASSWORD=([^ \n]+)/);
            if (matchNoQuotes) rootPassword = matchNoQuotes[1];
          }
        }
      } catch (e) {}

      res.json({ 
        success: true, 
        message: `Password for instance '${name}' reset successfully`,
        rootPassword,
        output: stdout
      });
    });
  } catch (error) {
    console.error('Reset MariaDB password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

export default router;
