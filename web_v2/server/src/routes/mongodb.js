import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(adminMiddleware);

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

    // Parse current settings from config (YAML format)
    const settings = parseMongoConfig(config);

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
 * Save MongoDB configuration
 */
router.post('/config', async (req, res) => {
  try {
    const { config, restart } = req.body;
    const configPath = '/etc/mongod.conf';

    // Backup current config
    const backupPath = `${configPath}.backup.${Date.now()}`;
    try {
      fs.copyFileSync(configPath, backupPath);
    } catch {
      // No existing config to backup
    }

    // Write new config
    fs.writeFileSync(configPath, config, 'utf8');

    // Restart service if requested
    if (restart) {
      exec('systemctl restart mongod', (error) => {
        if (error) {
          console.error('Restart mongod error:', error);
        }
      });
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
    if (!/^\/var\/lib\/mongodb\/|^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path. Must be in /var/lib/mongodb/ or /etc/mongodb/' });
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
    if (!/^\/var\/lib\/mongodb\/|^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path' });
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
router.post('/keyfile/upload', async (req, res) => {
  try {
    const { path: keyfilePath = '/var/lib/mongodb/keyfile', content } = req.body;

    // Validate path
    if (!/^\/var\/lib\/mongodb\/|^\/etc\/mongodb\//.test(keyfilePath)) {
      return res.status(400).json({ error: 'Invalid keyfile path. Must be in /var/lib/mongodb/ or /etc/mongodb/' });
    }

    // Validate content
    if (!content || content.length < 6 || content.length > 2048) {
      return res.status(400).json({ error: 'Invalid keyfile size. Must be between 6 and 2048 bytes.' });
    }

    // Basic validation - keyfile should contain only base64 characters
    if (!/^[A-Za-z0-9+/=\s]+$/.test(content.trim())) {
      return res.status(400).json({ error: 'Invalid keyfile content. Must be base64 encoded.' });
    }

    // Ensure directory exists
    const dir = path.dirname(keyfilePath);
    execSync(`mkdir -p ${dir}`, { encoding: 'utf8' });

    // Write keyfile
    fs.writeFileSync(keyfilePath, content.trim(), 'utf8');

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

export default router;
