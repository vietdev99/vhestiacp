import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';
const MONGODB_SETTINGS_FILE = path.join(HESTIA_DIR, 'data/mongodb-settings.json');

// All routes require admin
router.use(adminMiddleware);

// Helper: Load persistent MongoDB settings
function loadMongoSettings() {
  try {
    if (fs.existsSync(MONGODB_SETTINGS_FILE)) {
      return JSON.parse(fs.readFileSync(MONGODB_SETTINGS_FILE, 'utf8'));
    }
  } catch (e) {
    console.error('Failed to load MongoDB settings:', e);
  }
  return {
    clusterMode: 'standalone',
    replicaSetName: 'rs0',
    nodeRole: 'primary',
    shardRole: 'shardsvr',
    keyfilePath: '/var/lib/mongodb/keyfile',
    dataDir: '/var/lib/mongodb',
    pbm: {
      enabled: false,
      type: 'logical',
      storage: 'filesystem',
      path: '/var/lib/pbm/backups'
    }
  };
}

// Helper: Save persistent MongoDB settings
function saveMongoSettings(settings) {
  try {
    const dir = path.dirname(MONGODB_SETTINGS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MONGODB_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error('Failed to save MongoDB settings:', e);
    return false;
  }
}

/**
 * GET /api/mongodb/config
 * Get MongoDB configuration and status
 */
router.get('/config', async (req, res) => {
  try {
    // Get MongoDB status
    let status = 'stopped';
    let version = 'Unknown';

    try {
      execSync('systemctl is-active mongod', { encoding: 'utf8' });
      status = 'running';
    } catch {
      status = 'stopped';
    }

    // Get MongoDB version
    try {
      const versionOutput = execSync('mongod --version 2>&1 | head -1', { encoding: 'utf8' });
      const match = versionOutput.match(/v(\d+\.\d+\.\d+)/);
      if (match) version = match[1];
    } catch (e) {
      // Ignore
    }

    // Read config file
    let config = '';
    const configPath = '/etc/mongod.conf';
    try {
      config = fs.readFileSync(configPath, 'utf8');
    } catch {
      config = '';
    }

    // Load persistent settings (overrides parsed config)
    const savedSettings = loadMongoSettings();
    
    // Parse current settings from config file as fallback
    const parsedSettings = parseMongoConfig(config);
    
    // Merge: saved settings take priority
    const settings = { ...parsedSettings, ...savedSettings };

    res.json({
      status,
      version,
      configPath,
      config,
      settings
    });
  } catch (error) {
    console.error('Get MongoDB config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get MongoDB config' });
  }
});

/**
 * POST /api/mongodb/config
 * Save MongoDB configuration and cluster settings
 */
router.post('/config', async (req, res) => {
  try {
    const { 
      config, 
      restart, 
      clusterMode, 
      replicaSetName, 
      nodeRole, 
      shardRole, 
      keyfilePath, 
      dataDir,
      pbm
    } = req.body;
    
    console.log('=== MongoDB Config Save Request ===');
    console.log('clusterMode:', clusterMode);
    console.log('replicaSetName:', replicaSetName);
    console.log('pbm:', JSON.stringify(pbm));
    console.log('===================================');
    
    const configPath = '/etc/mongod.conf';

    // Save cluster settings to persistent file
    if (clusterMode !== undefined) {
      const currentSettings = loadMongoSettings();
      const newSettings = {
        ...currentSettings,
        clusterMode: clusterMode || currentSettings.clusterMode,
        replicaSetName: replicaSetName || currentSettings.replicaSetName,
        nodeRole: nodeRole || currentSettings.nodeRole,
        shardRole: shardRole || currentSettings.shardRole,
        keyfilePath: keyfilePath || currentSettings.keyfilePath,
        dataDir: dataDir || currentSettings.dataDir,
        pbm: pbm || currentSettings.pbm
      };
      saveMongoSettings(newSettings);
      
      // Update mongod.conf based on cluster settings
      if (config) {
        let updatedConfig = config;
        
        // Update replication section based on cluster mode
        if (clusterMode === 'replicaset') {
          // Add/update replication section
          if (!updatedConfig.includes('replication:')) {
            updatedConfig += `\n\nreplication:\n  replSetName: "${replicaSetName || 'rs0'}"\n`;
          } else {
            updatedConfig = updatedConfig.replace(
              /replSetName:\s*["']?[^"'\n]+["']?/,
              `replSetName: "${replicaSetName || 'rs0'}"`
            );
          }
          
          // Add keyFile if not present
          if (keyfilePath && !updatedConfig.includes('keyFile:')) {
            if (updatedConfig.includes('security:')) {
              updatedConfig = updatedConfig.replace(
                /security:/,
                `security:\n  keyFile: ${keyfilePath}`
              );
            } else {
              updatedConfig += `\nsecurity:\n  keyFile: ${keyfilePath}\n`;
            }
          }
        } else if (clusterMode === 'sharding') {
          // Add sharding section
          if (!updatedConfig.includes('sharding:')) {
            updatedConfig += `\n\nsharding:\n  clusterRole: ${shardRole || 'shardsvr'}\n`;
          }
        } else if (clusterMode === 'standalone') {
          // Remove replication and sharding sections for standalone
          updatedConfig = updatedConfig
            .replace(/\nreplication:[\s\S]*?(?=\n\w|$)/g, '')
            .replace(/\nsharding:[\s\S]*?(?=\n\w|$)/g, '');
        }
        
        // Write updated config
        // Backup current config
        const backupPath = `${configPath}.backup.${Date.now()}`;
        try {
          fs.copyFileSync(configPath, backupPath);
        } catch {
          // No existing config to backup
        }
        
        fs.writeFileSync(configPath, updatedConfig.trim() + '\n', 'utf8');
      }
    } else if (config) {
      // Just save raw config without cluster settings update
      const backupPath = `${configPath}.backup.${Date.now()}`;
      try {
        fs.copyFileSync(configPath, backupPath);
      } catch {
        // No existing config to backup
      }
      fs.writeFileSync(configPath, config, 'utf8');
    }

    // Restart service if requested
    if (restart) {
      exec('systemctl restart mongod', (error) => {
        if (error) {
          console.error('Restart mongod error:', error);
        }
      });
    }

    // Configure PBM if settings provided
    if (pbm) {
      try {
        const pbmConfigPath = '/etc/pbm-config.yaml';
        let yamlContent = '';

        if (pbm.storage === 'filesystem') {
          yamlContent = `storage:
  type: filesystem
  filesystem:
    path: ${pbm.path || '/var/lib/pbm/backups'}
`;
        } else if (pbm.storage === 's3') {
          yamlContent = `storage:
  type: s3
  s3:
    region: ${pbm.s3Region || 'us-east-1'}
    bucket: ${pbm.s3Bucket}
    endpointUrl: ${pbm.s3Endpoint}
    credentials:
      access-key-id: ${pbm.s3Key}
      secret-access-key: ${pbm.s3Secret}
`;
        }

        if (pbm.pitr) {
           yamlContent += `
pitr:
  enabled: true
  oplogSpanMin: ${pbm.pitrInterval || 10}
`;
        }

        if (yamlContent) {
          fs.writeFileSync(pbmConfigPath, yamlContent, 'utf8');
          // Ensure permissions and ownership for mongod user (who runs pbm-agent under systemd)
          execSync(`chown mongod:mongod ${pbmConfigPath}`);
          execSync(`chmod 600 ${pbmConfigPath}`);
        }

        // Setup PBM environment variable
        const mongoUri = `mongodb://127.0.0.1:27017/?replicaSet=${replicaSetName || 'rs0'}`;
        const pbmEnvFile = '/etc/default/pbm-agent';
        fs.writeFileSync(pbmEnvFile, `PBM_MONGODB_URI="${mongoUri}"\n`, 'utf8');

        // Allow time for service to pick up changes or ensuring env is set for CLI
        // Apply config via pbm config CLI (needs env var)
        // We do this AFTER service setup because pbm CLI needs to connect
        
        // Enable/Start or Disable/Stop service
        const action = pbm.enabled ? 'enable --now' : 'disable --now';
        exec(`systemctl ${action} pbm-agent`, (err) => {
          if (err) console.error('PBM Service Error:', err);
        });

      } catch (pbmError) {
        console.error('Failed to configure PBM:', pbmError);
        // Don't fail the whole request, just log
      }


    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Save MongoDB config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/mongodb/keyfile/generate
 * Generate a new keyfile for ReplicaSet/Sharding
 */
router.post('/keyfile/generate', async (req, res) => {
  try {
    const { path: keyfilePath = '/var/lib/mongodb/keyfile' } = req.body;

    // Validate path
    if (!/^\/var\/lib\/mongodb(-instances)?\//i.test(keyfilePath) && !/^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path. Must be in /var/lib/mongodb/, /var/lib/mongodb-instances/, or /etc/mongodb/' });
    }

    // Ensure directory exists
    const dir = path.dirname(keyfilePath);
    execSync(`mkdir -p ${dir}`, { encoding: 'utf8' });

    // Generate 756-byte random key
    execSync(`openssl rand -base64 756 > ${keyfilePath}`, { encoding: 'utf8' });

    // Set proper permissions
    execSync(`chmod 400 ${keyfilePath}`, { encoding: 'utf8' });
    execSync(`chown mongodb:mongodb ${keyfilePath}`, { encoding: 'utf8' });

    res.json({
      success: true,
      message: `Keyfile generated successfully at ${keyfilePath}`,
      path: keyfilePath
    });
  } catch (error) {
    console.error('Generate keyfile error:', error);
    res.status(500).json({ error: error.message || 'Failed to generate keyfile' });
  }
});

/**
 * GET /api/mongodb/keyfile/status
 * Check keyfile status
 */
router.get('/keyfile/status', async (req, res) => {
  try {
    const keyfilePath = req.query.path || '/var/lib/mongodb/keyfile';

    const exists = fs.existsSync(keyfilePath);
    let permissions = null;
    let owner = null;

    if (exists) {
      try {
        const stat = execSync(`stat -c '%a %U' ${keyfilePath}`, { encoding: 'utf8' }).trim();
        const [perm, own] = stat.split(' ');
        permissions = perm;
        owner = own;
      } catch {
        // Ignore
      }
    }

    res.json({
      exists,
      path: keyfilePath,
      permissions,
      owner,
      valid: exists && (permissions === '400' || permissions === '600')
    });
  } catch (error) {
    console.error('Keyfile status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get keyfile status' });
  }
});

/**
 * GET /api/mongodb/keyfile/download
 * Download existing keyfile
 */
router.get('/keyfile/download', async (req, res) => {
  try {
    const keyfilePath = req.query.path || '/var/lib/mongodb/keyfile';

    // Validate path
    if (!/^\/var\/lib\/mongodb(-instances)?\//i.test(keyfilePath) && !/^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path. Must be in /var/lib/mongodb/, /var/lib/mongodb-instances/, or /etc/mongodb/' });
    }

    if (!fs.existsSync(keyfilePath)) {
      return res.status(404).json({ error: 'Keyfile not found' });
    }

    // Read file content
    const content = execSync(`cat ${keyfilePath}`, { encoding: 'utf8' });

    res.setHeader('Content-Type', 'application/octet-stream');
    res.setHeader('Content-Disposition', 'attachment; filename="mongodb-keyfile"');
    res.send(content);
  } catch (error) {
    console.error('Download keyfile error:', error);
    res.status(500).json({ error: error.message || 'Failed to download keyfile' });
  }
});

/**
 * POST /api/mongodb/keyfile/upload
 * Upload keyfile
 */
const upload = multer({ storage: multer.memoryStorage() });
router.post('/keyfile/upload', upload.single('keyfile'), async (req, res) => {
  try {
    const keyfilePath = req.body.path || '/var/lib/mongodb/keyfile';
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Validate path
    if (!/^\/var\/lib\/mongodb(-instances)?\//i.test(keyfilePath) && !/^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path. Must be in /var/lib/mongodb/, /var/lib/mongodb-instances/, or /etc/mongodb/' });
    }

    // Validate content size
    if (file.size < 6 || file.size > 2048) {
      return res.status(400).json({ error: 'Invalid keyfile size. Must be between 6 and 2048 bytes.' });
    }

    const content = file.buffer.toString('utf8').trim();

    // Basic validation - keyfile should contain only base64 characters
    if (!/^[A-Za-z0-9+/=\s]+$/.test(content)) {
      return res.status(400).json({ error: 'Invalid keyfile content. Must be base64 encoded.' });
    }

    // Ensure directory exists
    const dir = path.dirname(keyfilePath);
    execSync(`mkdir -p ${dir}`, { encoding: 'utf8' });

    // Write keyfile
    fs.writeFileSync(keyfilePath, content, 'utf8');

    // Set proper permissions
    execSync(`chmod 400 ${keyfilePath}`, { encoding: 'utf8' });
    execSync(`chown mongodb:mongodb ${keyfilePath}`, { encoding: 'utf8' });

    res.json({
      success: true,
      message: `Keyfile uploaded successfully to ${keyfilePath}`,
      path: keyfilePath
    });
  } catch (error) {
    console.error('Upload keyfile error:', error);
    res.status(500).json({ error: error.message || 'Failed to upload keyfile' });
  }
});


/**
 * GET /api/mongodb/pbm/status
 * Get Percona Backup Manager status
 */
router.get('/pbm/status', async (req, res) => {
  try {
    let installed = false;
    let status = 'not_installed';
    let backups = [];

    // Check if PBM is installed
    try {
      execSync('which pbm', { encoding: 'utf8' });
      installed = true;
    } catch {
      installed = false;
    }

    if (installed) {
      // Check PBM agent status
      try {
        execSync('systemctl is-active pbm-agent', { encoding: 'utf8' });
        status = 'running';
      } catch {
        status = 'stopped';
      }

      // Get backup list
      try {
        const listOutput = execSync('pbm list --out=json 2>/dev/null || echo "[]"', { encoding: 'utf8' });
        backups = JSON.parse(listOutput);
      } catch {
        backups = [];
      }
    }

    res.json({
      installed,
      status,
      backups
    });
  } catch (error) {
    console.error('PBM status error:', error);
    res.status(500).json({ error: error.message || 'Failed to get PBM status' });
  }
});

/**
 * POST /api/mongodb/pbm/configure
 * Configure Percona Backup Manager
 */
router.post('/pbm/configure', async (req, res) => {
  try {
    const {
      storage = 'filesystem',
      backupPath = '/var/lib/pbm/backups',
      s3Endpoint,
      s3Bucket,
      s3AccessKey,
      s3SecretKey,
      compression = true,
      pitr = false,
      pitrInterval = 10
    } = req.body;

    // Build PBM config
    let pbmConfig = {
      storage: {}
    };

    if (storage === 'filesystem') {
      pbmConfig.storage.type = 'filesystem';
      pbmConfig.storage.filesystem = {
        path: backupPath
      };
      // Ensure backup directory exists
      execSync(`mkdir -p ${backupPath}`, { encoding: 'utf8' });
    } else if (storage === 's3') {
      pbmConfig.storage.type = 's3';
      pbmConfig.storage.s3 = {
        region: 'us-east-1',
        endpointUrl: s3Endpoint,
        bucket: s3Bucket,
        credentials: {
          'access-key-id': s3AccessKey,
          'secret-access-key': s3SecretKey
        }
      };
    }

    // Add compression
    if (compression) {
      pbmConfig.backup = { compression: 'zstd' };
    }

    // Add PITR if enabled
    if (pitr) {
      pbmConfig.pitr = {
        enabled: true,
        oplogSpanMin: pitrInterval
      };
    }

    // Save PBM config
    const configContent = JSON.stringify(pbmConfig, null, 2);

    // Apply config via pbm config
    execSync(`echo '${configContent}' | pbm config --file=/dev/stdin`, { encoding: 'utf8' });

    res.json({ success: true, message: 'PBM configured successfully' });
  } catch (error) {
    console.error('PBM configure error:', error);
    res.status(500).json({ error: error.message || 'Failed to configure PBM' });
  }
});

/**
 * POST /api/mongodb/pbm/backup
 * Trigger a backup
 */
router.post('/pbm/backup', async (req, res) => {
  try {
    const { type = 'logical' } = req.body;

    let cmd = 'pbm backup';
    if (type === 'physical') {
      cmd += ' --type=physical';
    } else if (type === 'incremental') {
      cmd += ' --type=incremental';
    }

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Backup error:', stderr);
        return res.status(500).json({ error: stderr || 'Backup failed' });
      }
      res.json({ success: true, message: 'Backup started', output: stdout });
    });
  } catch (error) {
    console.error('PBM backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to start backup' });
  }
});

/**
 * Helper: Parse MongoDB YAML config
 */
function parseMongoConfig(config) {
  const settings = {
    clusterMode: 'standalone',
    replicaSetName: 'rs0',
    nodeRole: 'primary',
    shardRole: 'shardsvr',
    keyfilePath: '/var/lib/mongodb/keyfile',
    dataDir: '/var/lib/mongodb'
  };

  if (!config) return settings;

  // Parse replication settings
  if (config.includes('replication:')) {
    settings.clusterMode = 'replicaset';
    const replMatch = config.match(/replSetName:\s*["']?([^"'\n]+)/);
    if (replMatch) settings.replicaSetName = replMatch[1];
  }

  // Parse sharding settings
  if (config.includes('sharding:')) {
    settings.clusterMode = 'sharding';
    const roleMatch = config.match(/clusterRole:\s*["']?([^"'\n]+)/);
    if (roleMatch) settings.shardRole = roleMatch[1];
  }

  // Parse security/keyfile
  const keyfileMatch = config.match(/keyFile:\s*["']?([^"'\n]+)/);
  if (keyfileMatch) settings.keyfilePath = keyfileMatch[1];

  // Parse storage
  const dbPathMatch = config.match(/dbPath:\s*["']?([^"'\n]+)/);
  if (dbPathMatch) settings.dataDir = dbPathMatch[1];

  return settings;
}

// ============================================================
// MongoDB Instance Management (Multi-Instance Support)
// ============================================================

const INSTANCES_META_FILE = path.join(HESTIA_DIR, 'data/mongodb-instances.json');

/**
 * GET /api/mongodb/instances
 * List all MongoDB instances
 */
router.get('/instances', async (req, res) => {
  try {
    const output = execSync(`${HESTIA_DIR}/bin/v-list-mongodb-instances json`, { 
      encoding: 'utf8',
      timeout: 30000 
    });
    const data = JSON.parse(output);
    res.json(data);
  } catch (error) {
    console.error('List instances error:', error);
    // Return empty array if no instances or script fails
    res.json({ instances: [] });
  }
});

/**
 * POST /api/mongodb/instances
 * Create a new MongoDB instance
 */
router.post('/instances', async (req, res) => {
  try {
    const { name, port, clusterMode = 'standalone', replicaSetName = 'rs0' } = req.body;

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
    const cmd = `${HESTIA_DIR}/bin/v-add-mongodb-instance "${name}" ${portNum} "${clusterMode}" "${replicaSetName}"`;
    
    exec(cmd, { timeout: 60000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Create instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to create instance' });
      }
      res.json({ success: true, message: `Instance '${name}' created successfully`, output: stdout });
    });
  } catch (error) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to create instance' });
  }
});

/**
 * GET /api/mongodb/instances/:name
 * Get instance details
 */
router.get('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    // Get all instances and find the specific one
    const output = execSync(`${HESTIA_DIR}/bin/v-list-mongodb-instances json`, { 
      encoding: 'utf8',
      timeout: 30000 
    });
    const data = JSON.parse(output);
    const instance = data.instances?.find(i => i.name === name);
    
    if (!instance) {
      return res.status(404).json({ error: `Instance '${name}' not found` });
    }
    
    // Get additional details like config content
    let config = '';
    if (instance.configPath && fs.existsSync(instance.configPath)) {
      config = fs.readFileSync(instance.configPath, 'utf8');
    }
    
    res.json({ ...instance, config });
  } catch (error) {
    console.error('Get instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to get instance details' });
  }
});

/**
 * PUT /api/mongodb/instances/:name
 * Update instance configuration
 */
router.put('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { config, restart = false } = req.body;
    
    const configPath = `/etc/mongodb-instances/${name}.conf`;
    
    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: `Instance '${name}' not found` });
    }
    
    if (config) {
      // Backup current config
      const backupPath = `${configPath}.backup.${Date.now()}`;
      fs.copyFileSync(configPath, backupPath);
      
      // Write new config
      fs.writeFileSync(configPath, config, 'utf8');
    }
    
    // Restart if requested
    if (restart) {
      exec(`${HESTIA_DIR}/bin/v-restart-mongodb-instance "${name}"`, (error) => {
        if (error) {
          console.error('Restart instance error:', error);
        }
      });
    }
    
    res.json({ success: true, message: 'Instance configuration updated' });
  } catch (error) {
    console.error('Update instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to update instance' });
  }
});

/**
 * DELETE /api/mongodb/instances/:name
 * Delete an instance
 */
router.delete('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const force = req.query.force === 'true';
    
    const cmd = force 
      ? `${HESTIA_DIR}/bin/v-delete-mongodb-instance "${name}" --force`
      : `${HESTIA_DIR}/bin/v-delete-mongodb-instance "${name}"`;
    
    exec(cmd, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Delete instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to delete instance' });
      }
      res.json({ success: true, message: `Instance '${name}' deleted successfully` });
    });
  } catch (error) {
    console.error('Delete instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete instance' });
  }
});

/**
 * POST /api/mongodb/instances/:name/start
 * Start an instance
 */
router.post('/instances/:name/start', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-start-mongodb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Start instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to start instance' });
      }
      res.json({ success: true, message: `Instance '${name}' started successfully` });
    });
  } catch (error) {
    console.error('Start instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to start instance' });
  }
});

/**
 * POST /api/mongodb/instances/:name/stop
 * Stop an instance
 */
router.post('/instances/:name/stop', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-stop-mongodb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Stop instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to stop instance' });
      }
      res.json({ success: true, message: `Instance '${name}' stopped successfully` });
    });
  } catch (error) {
    console.error('Stop instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop instance' });
  }
});

/**
 * POST /api/mongodb/instances/:name/restart
 * Restart an instance
 */
router.post('/instances/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    
    exec(`${HESTIA_DIR}/bin/v-restart-mongodb-instance "${name}"`, { timeout: 30000 }, (error, stdout, stderr) => {
      if (error) {
        console.error('Restart instance error:', stderr || error.message);
        return res.status(500).json({ error: stderr || error.message || 'Failed to restart instance' });
      }
      res.json({ success: true, message: `Instance '${name}' restarted successfully` });
    });
  } catch (error) {
    console.error('Restart instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart instance' });
  }
});

/**
 * POST /api/mongodb/instances/check-port
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
 * GET /api/mongodb/instances
 * List all MongoDB instances
 */
router.get('/instances', async (req, res) => {
  try {
    const result = execSync('bash /usr/local/hestia/bin/v-list-mongodb-instances json', { encoding: 'utf8' });
    const instances = JSON.parse(result || '{}');
    res.json(instances);
  } catch (error) {
    console.error('List instances error:', error);
    res.status(500).json({ error: error.message || 'Failed to list instances' });
  }
});

/**
 * POST /api/mongodb/instances
 * Create a new MongoDB instance
 */
router.post('/instances', async (req, res) => {
  try {
    const { name, port, dataDir } = req.body;
    
    if (!name || !port) {
      return res.status(400).json({ error: 'Name and port are required' });
    }

    // Create instance using shell script
    execSync(`bash /usr/local/hestia/bin/v-add-mongodb-instance '${name}' '${port}' '${dataDir || ''}'`, { encoding: 'utf8' });
    
    res.json({ success: true, message: `Instance ${name} created successfully` });
  } catch (error) {
    console.error('Create instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to create instance' });
  }
});

/**
 * DELETE /api/mongodb/instances/:name
 * Delete a MongoDB instance
 */
router.delete('/instances/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (name === 'default') {
      return res.status(400).json({ error: 'Cannot delete default instance' });
    }

    execSync(`bash /usr/local/hestia/bin/v-delete-mongodb-instance '${name}'`, { encoding: 'utf8' });
    
    res.json({ success: true, message: `Instance ${name} deleted successfully` });
  } catch (error) {
    console.error('Delete instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete instance' });
  }
});

/**
 * GET /api/mongodb/instances/:name/config
 * Get instance configuration
 */
router.get('/instances/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const configPath = name === 'default' 
      ? '/etc/mongod.conf'
      : `/etc/mongodb-instances/${name}.conf`;

    if (!fs.existsSync(configPath)) {
      return res.status(404).json({ error: `Config file not found for instance ${name}` });
    }

    const config = fs.readFileSync(configPath, 'utf8');
    
    // Load settings from JSON file for this instance
    const instanceSettingsFile = path.join(HESTIA_DIR, `data/mongodb-instances/${name}-settings.json`);
    let settings = {};
    if (fs.existsSync(instanceSettingsFile)) {
      settings = JSON.parse(fs.readFileSync(instanceSettingsFile, 'utf8'));
    }

    res.json({ config, settings });
  } catch (error) {
    console.error('Get instance config error:', error);
    res.status(500).json({ error: error.message || 'Failed to get instance config' });
  }
});

/**
 * POST /api/mongodb/instances/:name/config
 * Save instance configuration
 */
router.post('/instances/:name/config', async (req, res) => {
  try {
    const { name } = req.params;
    const { config, restart, settings } = req.body;

    const configPath = name === 'default' 
      ? '/etc/mongod.conf'
      : `/etc/mongodb-instances/${name}.conf`;

    // Save config file
    if (config) {
      const backupPath = `${configPath}.backup.${Date.now()}`;
      try {
        fs.copyFileSync(configPath, backupPath);
      } catch {
        // No existing config to backup
      }
      fs.writeFileSync(configPath, config, 'utf8');
    }

    // Save settings to JSON file
    if (settings) {
      const instanceSettingsFile = path.join(HESTIA_DIR, `data/mongodb-instances/${name}-settings.json`);
      const dir = path.dirname(instanceSettingsFile);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(instanceSettingsFile, JSON.stringify(settings, null, 2), 'utf8');
    }

    // Restart instance if requested
    if (restart) {
      const serviceName = name === 'default' ? 'mongod' : `mongod-${name}`;
      exec(`systemctl restart ${serviceName}`, (error) => {
        if (error) {
          console.error(`Restart ${serviceName} error:`, error);
        }
      });
    }

    res.json({ success: true, message: 'Configuration saved successfully' });
  } catch (error) {
    console.error('Save instance config error:', error);
    res.status(500).json({ error: error.message || 'Failed to save configuration' });
  }
});

/**
 * POST /api/mongodb/instances/:name/start
 * Start a MongoDB instance
 */
router.post('/instances/:name/start', async (req, res) => {
  try {
    const { name } = req.params;
    execSync(`bash /usr/local/hestia/bin/v-start-mongodb-instance '${name}'`, { encoding: 'utf8' });
    res.json({ success: true, message: `Instance ${name} started successfully` });
  } catch (error) {
    console.error('Start instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to start instance' });
  }
});

/**
 * POST /api/mongodb/instances/:name/stop
 * Stop a MongoDB instance
 */
router.post('/instances/:name/stop', async (req, res) => {
  try {
    const { name } = req.params;
    execSync(`bash /usr/local/hestia/bin/v-stop-mongodb-instance '${name}'`, { encoding: 'utf8' });
    res.json({ success: true, message: `Instance ${name} stopped successfully` });
  } catch (error) {
    console.error('Stop instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop instance' });
  }
});

/**
 * POST /api/mongodb/instances/:name/restart
 * Restart a MongoDB instance
 */
router.post('/instances/:name/restart', async (req, res) => {
  try {
    const { name } = req.params;
    execSync(`bash /usr/local/hestia/bin/v-restart-mongodb-instance '${name}'`, { encoding: 'utf8' });
    res.json({ success: true, message: `Instance ${name} restarted successfully` });
  } catch (error) {
    console.error('Restart instance error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart instance' });
  }
});

export default router;


