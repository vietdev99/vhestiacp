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
 * POST /api/rclone/oauth/start
 * Start OAuth authorization flow
 * This starts rclone authorize in the background and returns auth URL
 */
router.post('/oauth/start', async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Supported OAuth providers
    const supportedProviders = ['drive', 'dropbox', 'onedrive'];
    if (!supportedProviders.includes(provider)) {
      return res.status(400).json({ error: 'Provider does not support web OAuth' });
    }

    // Generate a unique state for this auth session
    const state = `vhestia_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Store the state in a temp file to track the session
    const stateFile = `/tmp/rclone_oauth_${state}.json`;
    fs.writeFileSync(stateFile, JSON.stringify({ provider, started: Date.now() }));

    // Start rclone authorize with --auth-no-open-browser
    // This will output a URL that the user needs to visit
    const child = exec(
      `rclone authorize ${provider} --auth-no-open-browser 2>&1`,
      { timeout: 120000 }, // 2 minute timeout
      (error, stdout, stderr) => {
        // Parse the token from stdout when complete
        try {
          const tokenMatch = stdout.match(/Paste the following into your remote machine[\s\S]*?({[\s\S]*?})\s*$/);
          if (tokenMatch) {
            const tokenData = {
              token: tokenMatch[1].trim(),
              completed: Date.now()
            };
            fs.writeFileSync(stateFile, JSON.stringify({ ...JSON.parse(fs.readFileSync(stateFile, 'utf8')), ...tokenData }));
          }
        } catch (e) {
          console.error('Failed to parse token:', e);
        }
      }
    );

    // Wait a bit for rclone to output the URL
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Try to read the URL from rclone output by checking the process
    // Since we can't easily capture streaming output, we'll use a different approach
    // The URL format for rclone is predictable based on provider

    // For now, return the state and let client poll for completion
    res.json({
      success: true,
      state,
      message: 'OAuth process started. Please check the server console for the authorization URL, or use the manual method.',
      manualCommand: `rclone authorize ${provider}`
    });
  } catch (error) {
    console.error('OAuth start error:', error);
    res.status(500).json({ error: error.message || 'Failed to start OAuth' });
  }
});

/**
 * GET /api/rclone/oauth/status/:state
 * Check OAuth authorization status
 */
router.get('/oauth/status/:state', async (req, res) => {
  try {
    const { state } = req.params;
    const stateFile = `/tmp/rclone_oauth_${state}.json`;

    if (!fs.existsSync(stateFile)) {
      return res.status(404).json({ error: 'OAuth session not found' });
    }

    const data = JSON.parse(fs.readFileSync(stateFile, 'utf8'));

    if (data.token) {
      // Clean up the state file
      fs.unlinkSync(stateFile);
      return res.json({
        completed: true,
        token: data.token
      });
    }

    // Check if session expired (5 minutes)
    if (Date.now() - data.started > 5 * 60 * 1000) {
      fs.unlinkSync(stateFile);
      return res.status(410).json({ error: 'OAuth session expired' });
    }

    res.json({
      completed: false,
      message: 'Waiting for authorization...'
    });
  } catch (error) {
    console.error('OAuth status error:', error);
    res.status(500).json({ error: error.message || 'Failed to check OAuth status' });
  }
});

/**
 * POST /api/rclone/oauth/authorize
 * Run rclone authorize and return the auth URL directly
 * Uses a simpler approach - runs authorize and captures output
 */
router.post('/oauth/authorize', async (req, res) => {
  try {
    const { provider } = req.body;

    if (!provider) {
      return res.status(400).json({ error: 'Provider is required' });
    }

    // Run rclone authorize with headless mode to get the URL
    // We'll use spawn to capture stdout in real-time
    const { spawn } = await import('child_process');

    const proc = spawn('rclone', ['authorize', provider, '--auth-no-open-browser'], {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    let output = '';
    let authUrl = null;

    proc.stdout.on('data', (data) => {
      output += data.toString();
      // Look for the auth URL in the output
      const urlMatch = output.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && !authUrl) {
        authUrl = urlMatch[1];
      }
    });

    proc.stderr.on('data', (data) => {
      output += data.toString();
      const urlMatch = output.match(/(https?:\/\/[^\s]+)/);
      if (urlMatch && !authUrl) {
        authUrl = urlMatch[1];
      }
    });

    // Wait up to 5 seconds for the URL
    const timeout = setTimeout(() => {
      if (!authUrl) {
        proc.kill();
      }
    }, 5000);

    // Return URL as soon as we have it
    const checkUrl = setInterval(() => {
      if (authUrl) {
        clearInterval(checkUrl);
        clearTimeout(timeout);
        res.json({
          success: true,
          authUrl,
          pid: proc.pid,
          message: 'Open the URL in your browser to authorize'
        });
      }
    }, 100);

    // Handle process completion to capture token
    proc.on('close', (code) => {
      clearInterval(checkUrl);
      clearTimeout(timeout);

      // Try to extract the token from output
      const tokenMatch = output.match(/Paste the following into your remote machine[\s\S]*?({[\s\S]*?})\s*$/);
      if (tokenMatch) {
        // Store the token in a temp file keyed by PID
        const tokenFile = `/tmp/rclone_token_${proc.pid}.json`;
        fs.writeFileSync(tokenFile, tokenMatch[1].trim());
      }

      if (!res.headersSent) {
        if (authUrl) {
          res.json({
            success: true,
            authUrl,
            pid: proc.pid,
            message: 'Open the URL in your browser to authorize'
          });
        } else {
          res.status(500).json({ error: 'Failed to get authorization URL', output });
        }
      }
    });

  } catch (error) {
    console.error('OAuth authorize error:', error);
    res.status(500).json({ error: error.message || 'Failed to start authorization' });
  }
});

/**
 * GET /api/rclone/oauth/token/:pid
 * Get the token after OAuth completion
 */
router.get('/oauth/token/:pid', async (req, res) => {
  try {
    const { pid } = req.params;
    const tokenFile = `/tmp/rclone_token_${pid}.json`;

    if (!fs.existsSync(tokenFile)) {
      return res.json({
        completed: false,
        message: 'Waiting for authorization to complete...'
      });
    }

    const token = fs.readFileSync(tokenFile, 'utf8');

    // Clean up
    fs.unlinkSync(tokenFile);

    res.json({
      completed: true,
      token
    });
  } catch (error) {
    console.error('Get token error:', error);
    res.status(500).json({ error: error.message || 'Failed to get token' });
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
