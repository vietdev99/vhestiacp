import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(adminMiddleware);

const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';
const INSTANCES_DATA_DIR = '/var/lib/postgresql-instances';
const INSTANCES_CONF_DIR = '/etc/postgresql-instances';

/**
 * GET /api/pgsql/config
 * Get PostgreSQL configuration and status
 */
router.get('/config', async (req, res) => {
  try {
    // Get PostgreSQL status
    let status = 'stopped';
    let version = 'Unknown';

    try {
      execSync('systemctl is-active postgresql', { encoding: 'utf8' });
      status = 'running';
    } catch {
      // Try pg_isready
      try {
        execSync('pg_isready -q', { encoding: 'utf8' });
        status = 'running';
      } catch {
        status = 'stopped';
      }
    }

    // Get PostgreSQL version
    try {
      const versionOutput = execSync('psql --version 2>&1', { encoding: 'utf8' });
      const match = versionOutput.match(/(\d+\.\d+)/);
      if (match) version = match[1];
    } catch (e) {
      // Ignore
    }

    res.json({
      status,
      version
    });
  } catch (error) {
    console.error('Get PostgreSQL config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get PostgreSQL config' });
  }
});

// ============================================================
// PostgreSQL Instance Management (Multi-Instance Support)
// ============================================================

/**
 * GET /api/pgsql/instances
 * List all PostgreSQL instances
 */
router.get('/instances', async (req, res) => {
  try {
    let output;
    try {
      output = execSync(`${HESTIA_DIR}/bin/v-list-pgsql-instances json`, { 
        encoding: 'utf8',
        timeout: 30000 
      });
    } catch (e) {
      output = '{"instances": []}';
    }
    
    let data = JSON.parse(output);
    
    // Auto-create default instance if none exist
    if (!data.instances || data.instances.length === 0) {
      console.log('No PostgreSQL instances found, creating default...');
      try {
        execSync(`${HESTIA_DIR}/bin/v-add-pgsql-instance default 5433 standalone`, {
          encoding: 'utf8',
          timeout: 120000
        });
        // Reload instances list
        output = execSync(`${HESTIA_DIR}/bin/v-list-pgsql-instances json`, { 
          encoding: 'utf8',
          timeout: 30000 
        });
        data = JSON.parse(output);
      } catch (createError) {
        console.error('Failed to create default PostgreSQL instance:', createError);
      }
    }
    
    res.json(data);
  } catch (error) {
    console.error('List PostgreSQL instances error:', error);
    // Return empty array if no instances or script fails
    res.json({ instances: [] });
  }
});

/**
 * POST /api/pgsql/instances
 * Create a new PostgreSQL instance
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
      ? `${HESTIA_DIR}/bin/v-add-pgsql-instance "${name}" ${portNum} "${dataDir}"`
      : `${HESTIA_DIR}/bin/v-add-pgsql-instance "${name}" ${portNum}`;
    
    exec(cmd, { timeout: 120000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Create PostgreSQL instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to create instance' });
      }

      // Save instance settings if provided
      const { instanceType, primaryHost, primaryPort, replicationUser, replicationPassword } = req.body;
      if (instanceType) {
        try {
          const settingsDir = path.join(HESTIA_DIR, 'data/pgsql-instances');
          if (!fs.existsSync(settingsDir)) {
            fs.mkdirSync(settingsDir, { recursive: true });
          }
          
          const settings = {
            instanceType: instanceType || 'standalone',
            primaryHost: primaryHost || '',
            primaryPort: primaryPort || 5432,
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
        const confPath = path.join(HESTIA_DIR, `conf/pgsql-${name}.conf`);
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
    console.error('Create PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to create instance' });
  }
});

/**
 * GET /api/pgsql/instances/:name
 * Get instance details
 */
router.get('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get all instances and find the specific one
    const output = execSync(`${HESTIA_DIR}/bin/v-list-pgsql-instances json`, { 
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
    const settingsDir = path.join(HESTIA_DIR, 'data/pgsql-instances');
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
    const hestiaConfPath = path.join(HESTIA_DIR, `conf/pgsql-${name}.conf`);
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
    console.error('Get PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to get instance details' });
  }
});

/**
 * DELETE /api/pgsql/instances/:name
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
      ? `${HESTIA_DIR}/bin/v-delete-pgsql-instance "${name}" --force`
      : `${HESTIA_DIR}/bin/v-delete-pgsql-instance "${name}"`;
    
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Delete PostgreSQL instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to delete instance' });
      }
      res.json({ success: true, message: `Instance '${name}' deleted successfully` });
    });
  } catch (error) {
    console.error('Delete PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete instance' });
  }
});

/**
 * POST /api/pgsql/instances/:name/config
 * Save instance configuration
 */
router.post('/instances/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const { config, restart, settings } = req.body;

    // Determine config path
    let configPath;
    if (name === 'default') {
      // Find default PostgreSQL config
      const pgVersions = fs.readdirSync('/etc/postgresql').filter(f => /^\d+$/.test(f));
      if (pgVersions.length > 0) {
        const latestVersion = pgVersions.sort((a, b) => parseInt(b) - parseInt(a))[0];
        configPath = `/etc/postgresql/${latestVersion}/main/postgresql.conf`;
      }
    } else {
      configPath = `${INSTANCES_CONF_DIR}/${name}/postgresql.conf`;
    }

    // Save config file
    if (config && configPath) {
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
      const settingsDir = path.join(HESTIA_DIR, 'data/pgsql-instances');
      if (!fs.existsSync(settingsDir)) {
        fs.mkdirSync(settingsDir, { recursive: true });
      }
      const instanceSettingsFile = path.join(settingsDir, `${name}-settings.json`);
      fs.writeFileSync(instanceSettingsFile, JSON.stringify(settings, null, 2), 'utf8');
    }

    // Restart instance if requested
    if (restart) {
      const serviceName = name === 'default' ? 'postgresql' : `postgresql-${name}`;
      exec(`systemctl restart ${serviceName}`, (error) => {
        if (error) {
          console.error(`Restart ${serviceName} error:`, error);
        }
      });
    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Save PostgreSQL instance config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/pgsql/instances/:name/start
 * Start an instance
 */
router.post('/instances/:name/start', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-start-pgsql-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Start PostgreSQL instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to start instance' });
      }
      res.json({ success: true, message: `Instance '${name}' started successfully` });
    });
  } catch (error) {
    console.error('Start PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to start instance' });
  }
});

/**
 * POST /api/pgsql/instances/:name/stop
 * Stop an instance
 */
router.post('/instances/:name/stop', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-stop-pgsql-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Stop PostgreSQL instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to stop instance' });
      }
      res.json({ success: true, message: `Instance '${name}' stopped successfully` });
    });
  } catch (error) {
    console.error('Stop PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop instance' });
  }
});

/**
 * POST /api/pgsql/instances/:name/restart
 * Restart an instance
 */
router.post('/instances/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-restart-pgsql-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Restart PostgreSQL instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to restart instance' });
      }
      res.json({ success: true, message: `Instance '${name}' restarted successfully` });
    });
  } catch (error) {
    console.error('Restart PostgreSQL instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart instance' });
  }
});

/**
 * POST /api/pgsql/instances/check-port
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
 * POST /api/pgsql/instances/:name/reset-password
 * Reset postgres password for an instance
 */
router.post('/instances/:name/reset-password', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-reset-pgsql-instance-password "${name}"`, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Reset PostgreSQL password error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to reset password' });
      }
      // Read new password
      let rootPassword = '';
      try {
        const confPath = path.join(HESTIA_DIR, `conf/pgsql-${name}.conf`);
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
    console.error('Reset PostgreSQL password error:', error);
    res.status(500).json({ error: error.message || 'Failed to reset password' });
  }
});

export default router;
