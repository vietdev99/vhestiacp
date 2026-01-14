import express from 'express';
import { exec, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { adminMiddleware } from '../middleware/auth.js';

const router = express.Router();

// Admin only for system rclone config
router.use(adminMiddleware);

/**
 * GET /api/rclone/remotes
 * List all configured rclone remotes (system-level)
 */
router.get('/remotes', async (req, res) => {
  try {
    const remotes = [];

    // Get list of remotes
    let remotesOutput = '';
    try {
      remotesOutput = execSync('rclone listremotes 2>/dev/null', { encoding: 'utf8' });
    } catch {
      // No remotes configured
    }

    const remoteNames = remotesOutput.split('\n')
      .map(r => r.trim().replace(/:$/, ''))
      .filter(r => r);

    for (const name of remoteNames) {
      // Get remote type
      let type = 'unknown';
      try {
        const configOutput = execSync(`rclone config show ${name} 2>/dev/null`, { encoding: 'utf8' });
        const typeMatch = configOutput.match(/^type\s*=\s*(.+)$/m);
        if (typeMatch) type = typeMatch[1].trim();
      } catch {
        // Ignore
      }

      // Quick connection test
      let connected = false;
      try {
        execSync(`timeout 5 rclone lsd ${name}: --max-depth 0 2>/dev/null`, { encoding: 'utf8' });
        connected = true;
      } catch {
        connected = false;
      }

      remotes.push({
        name,
        type,
        connected
      });
    }

    res.json({ remotes });
  } catch (error) {
    console.error('List remotes error:', error);
    res.status(500).json({ error: error.message || 'Failed to list remotes' });
  }
});

/**
 * GET /api/rclone/remote/:name
 * Get details of a specific remote
 */
router.get('/remote/:name', async (req, res) => {
  try {
    const { name } = req.params;

    // Get remote config
    let config = {};
    try {
      const configOutput = execSync(`rclone config show ${name} 2>/dev/null`, { encoding: 'utf8' });
      const lines = configOutput.split('\n');
      for (const line of lines) {
        const match = line.match(/^(\w+)\s*=\s*(.+)$/);
        if (match) {
          config[match[1]] = match[2].trim();
        }
      }
    } catch {
      return res.status(404).json({ error: 'Remote not found' });
    }

    // Test connection
    let connected = false;
    try {
      execSync(`timeout 5 rclone lsd ${name}: --max-depth 0 2>/dev/null`, { encoding: 'utf8' });
      connected = true;
    } catch {
      connected = false;
    }

    res.json({
      name,
      type: config.type || 'unknown',
      config,
      connected
    });
  } catch (error) {
    console.error('Get remote error:', error);
    res.status(500).json({ error: error.message || 'Failed to get remote' });
  }
});

/**
 * POST /api/rclone/remote
 * Create a new rclone remote
 */
router.post('/remote', async (req, res) => {
  try {
    const { name, type, config } = req.body;

    if (!name || !type) {
      return res.status(400).json({ error: 'Name and type are required' });
    }

    // Validate name format
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Name can only contain letters, numbers, underscores and hyphens' });
    }

    // Build rclone config create command
    let cmd = `rclone config create ${name} ${type}`;

    // Add config parameters
    if (config && typeof config === 'object') {
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null && value !== '') {
          // Escape special characters
          const escapedValue = String(value).replace(/'/g, "'\\''");
          cmd += ` ${key}='${escapedValue}'`;
        }
      }
    }

    cmd += ' 2>&1';

    exec(cmd, (error, stdout, stderr) => {
      if (error) {
        console.error('Create remote error:', stderr);
        return res.status(500).json({ error: stderr || stdout || 'Failed to create remote' });
      }

      res.json({
        success: true,
        message: `Remote '${name}' created successfully`,
        output: stdout
      });
    });
  } catch (error) {
    console.error('Create remote error:', error);
    res.status(500).json({ error: error.message || 'Failed to create remote' });
  }
});

/**
 * PUT /api/rclone/remote/:name
 * Update an existing rclone remote
 */
router.put('/remote/:name', async (req, res) => {
  try {
    const { name } = req.params;
    const { config } = req.body;

    if (!config || typeof config !== 'object') {
      return res.status(400).json({ error: 'Config is required' });
    }

    // Update each config parameter
    for (const [key, value] of Object.entries(config)) {
      if (value !== undefined) {
        const escapedValue = String(value).replace(/'/g, "'\\''");
        try {
          execSync(`rclone config update ${name} ${key}='${escapedValue}' 2>&1`, { encoding: 'utf8' });
        } catch (e) {
          console.error(`Failed to update ${key}:`, e.message);
        }
      }
    }

    res.json({
      success: true,
      message: `Remote '${name}' updated successfully`
    });
  } catch (error) {
    console.error('Update remote error:', error);
    res.status(500).json({ error: error.message || 'Failed to update remote' });
  }
});

/**
 * DELETE /api/rclone/remote/:name
 * Delete an rclone remote
 */
router.delete('/remote/:name', async (req, res) => {
  try {
    const { name } = req.params;

    exec(`rclone config delete ${name} 2>&1`, (error, stdout, stderr) => {
      if (error) {
        console.error('Delete remote error:', stderr);
        return res.status(500).json({ error: stderr || stdout || 'Failed to delete remote' });
      }

      res.json({
        success: true,
        message: `Remote '${name}' deleted successfully`
      });
    });
  } catch (error) {
    console.error('Delete remote error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete remote' });
  }
});

/**
 * POST /api/rclone/remote/:name/test
 * Test connection to a remote
 */
router.post('/remote/:name/test', async (req, res) => {
  try {
    const { name } = req.params;

    exec(`timeout 10 rclone lsd ${name}: --max-depth 0 2>&1`, (error, stdout, stderr) => {
      if (error) {
        return res.json({
          success: false,
          connected: false,
          error: stderr || stdout || 'Connection test failed'
        });
      }

      res.json({
        success: true,
        connected: true,
        message: 'Connection successful'
      });
    });
  } catch (error) {
    console.error('Test remote error:', error);
    res.status(500).json({ error: error.message || 'Failed to test remote' });
  }
});

/**
 * GET /api/rclone/providers
 * Get list of supported rclone providers
 */
router.get('/providers', async (req, res) => {
  try {
    // Common providers for backup purposes
    const providers = [
      {
        id: 'drive',
        name: 'Google Drive',
        authType: 'oauth',
        fields: [
          { name: 'token', label: 'OAuth Token', type: 'textarea', required: true, help: 'Run "rclone authorize drive" on your local machine and paste the token here' },
          { name: 'root_folder_id', label: 'Root Folder ID', type: 'text', required: false, help: 'Optional: Folder ID to use as root' }
        ]
      },
      {
        id: 'dropbox',
        name: 'Dropbox',
        authType: 'oauth',
        fields: [
          { name: 'token', label: 'OAuth Token', type: 'textarea', required: true, help: 'Run "rclone authorize dropbox" on your local machine' }
        ]
      },
      {
        id: 'onedrive',
        name: 'Microsoft OneDrive',
        authType: 'oauth',
        fields: [
          { name: 'token', label: 'OAuth Token', type: 'textarea', required: true, help: 'Run "rclone authorize onedrive" on your local machine' }
        ]
      },
      {
        id: 's3',
        name: 'Amazon S3',
        authType: 'keys',
        fields: [
          { name: 'provider', label: 'Provider', type: 'hidden', value: 'AWS' },
          { name: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
          { name: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true },
          { name: 'region', label: 'Region', type: 'select', required: true, options: [
            'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
            'eu-west-1', 'eu-west-2', 'eu-central-1',
            'ap-northeast-1', 'ap-southeast-1', 'ap-southeast-2'
          ]}
        ]
      },
      {
        id: 's3',
        name: 'S3 Compatible (MinIO, Wasabi, etc.)',
        authType: 'keys',
        subType: 'compatible',
        fields: [
          { name: 'provider', label: 'Provider', type: 'hidden', value: 'Other' },
          { name: 'endpoint', label: 'Endpoint URL', type: 'text', required: true, placeholder: 'https://s3.example.com' },
          { name: 'access_key_id', label: 'Access Key ID', type: 'text', required: true },
          { name: 'secret_access_key', label: 'Secret Access Key', type: 'password', required: true }
        ]
      },
      {
        id: 'b2',
        name: 'Backblaze B2',
        authType: 'keys',
        fields: [
          { name: 'account', label: 'Account ID / Application Key ID', type: 'text', required: true },
          { name: 'key', label: 'Application Key', type: 'password', required: true }
        ]
      },
      {
        id: 'sftp',
        name: 'SFTP (SSH)',
        authType: 'keys',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: false, value: '22' },
          { name: 'user', label: 'Username', type: 'text', required: true },
          { name: 'pass', label: 'Password', type: 'password', required: false },
          { name: 'key_file', label: 'SSH Key File Path', type: 'text', required: false, help: 'Path to SSH private key (leave empty to use password)' }
        ]
      },
      {
        id: 'ftp',
        name: 'FTP',
        authType: 'keys',
        fields: [
          { name: 'host', label: 'Host', type: 'text', required: true },
          { name: 'port', label: 'Port', type: 'number', required: false, value: '21' },
          { name: 'user', label: 'Username', type: 'text', required: true },
          { name: 'pass', label: 'Password', type: 'password', required: true }
        ]
      }
    ];

    res.json({ providers });
  } catch (error) {
    console.error('Get providers error:', error);
    res.status(500).json({ error: error.message || 'Failed to get providers' });
  }
});

export default router;
