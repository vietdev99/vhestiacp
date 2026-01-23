import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';
import { execSync } from 'child_process';
import fs from 'fs';

const router = Router();

/**
 * GET /api/pm2
 * List PM2 processes for current user (or all users if admin)
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const isAdmin = user.role === 'admin';

    if (isAdmin) {
      // Admin sees all users' PM2 processes
      const result = await execHestiaJson('v-list-sys-pm2', []);
      res.json(result);
    } else {
      // Regular user sees only their PM2 processes
      const result = await execHestiaJson('v-list-user-pm2', [user.user]);
      res.json(result);
    }
  } catch (error) {
    console.error('List PM2 error:', error);
    // Check if PM2 not installed
    if (error.message?.includes('PM2 not installed')) {
      return res.json({ pm2_installed: false, processes: [] });
    }
    res.status(500).json({ error: 'Failed to list PM2 processes' });
  }
});

/**
 * GET /api/pm2/user/:username
 * List PM2 processes for a specific user (admin only)
 */
router.get('/user/:username', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const result = await execHestiaJson('v-list-user-pm2', [username]);
    res.json(result);
  } catch (error) {
    console.error('List user PM2 error:', error);
    res.status(500).json({ error: 'Failed to list PM2 processes' });
  }
});

/**
 * POST /api/pm2/:id/restart
 * Restart a PM2 process
 */
router.post('/:id/restart', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    // Determine target user
    const targetUser = isAdmin && username ? username : user.user;

    await execHestia('v-restart-pm2-app', [targetUser, id]);
    res.json({ success: true, message: 'Process restarted successfully' });
  } catch (error) {
    console.error('Restart PM2 error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart process' });
  }
});

/**
 * POST /api/pm2/:id/stop
 * Stop a PM2 process
 */
router.post('/:id/stop', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    const targetUser = isAdmin && username ? username : user.user;

    await execHestia('v-stop-pm2-app', [targetUser, id]);
    res.json({ success: true, message: 'Process stopped successfully' });
  } catch (error) {
    console.error('Stop PM2 error:', error);
    res.status(500).json({ error: error.message || 'Failed to stop process' });
  }
});

/**
 * POST /api/pm2/:id/start
 * Start a PM2 process
 */
router.post('/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.body;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    const targetUser = isAdmin && username ? username : user.user;

    await execHestia('v-start-pm2-app', [targetUser, id]);
    res.json({ success: true, message: 'Process started successfully' });
  } catch (error) {
    console.error('Start PM2 error:', error);
    res.status(500).json({ error: error.message || 'Failed to start process' });
  }
});

/**
 * DELETE /api/pm2/:id
 * Delete a PM2 process
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { username } = req.query;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    const targetUser = isAdmin && username ? username : user.user;

    await execHestia('v-delete-pm2-app', [targetUser, id]);
    res.json({ success: true, message: 'Process deleted successfully' });
  } catch (error) {
    console.error('Delete PM2 error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete process' });
  }
});

/**
 * GET /api/pm2/:id/logs
 * Get logs for a PM2 process
 */
router.get('/:id/logs', async (req, res) => {
  try {
    const { id } = req.params;
    const { username, lines = 100 } = req.query;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    const targetUser = isAdmin && username ? username : user.user;
    const numLines = Math.min(parseInt(lines) || 100, 500);

    // Get PM2 logs directly using pm2 logs command or reading log files
    let outLogs = [];
    let errLogs = [];

    try {
      // Try to get logs using pm2 logs command with --nostream and --lines
      // Run as the target user if not admin/root
      let pm2Cmd;
      if (targetUser === 'root' || targetUser === 'admin') {
        pm2Cmd = `pm2 logs ${id} --nostream --lines ${numLines} 2>&1`;
      } else {
        pm2Cmd = `sudo -u ${targetUser} pm2 logs ${id} --nostream --lines ${numLines} 2>&1`;
      }

      const logsOutput = execSync(pm2Cmd, {
        encoding: 'utf8',
        timeout: 10000,
        maxBuffer: 10 * 1024 * 1024
      });

      // Parse the logs output - PM2 outputs both stdout and stderr mixed
      const lines = logsOutput.split('\n');
      let currentType = null;

      for (const line of lines) {
        // Skip empty lines and PM2 header lines
        if (!line.trim() || line.includes('[TAILING]') || line.includes('last') || line.includes('Logs')) {
          continue;
        }

        // Detect log type from PM2 output format (e.g., "0|app-name |" or error indicators)
        if (line.includes('-error-') || line.includes('err_log') || line.includes('stderr')) {
          currentType = 'err';
        } else if (line.includes('-out-') || line.includes('out_log') || line.includes('stdout')) {
          currentType = 'out';
        }

        // Add to appropriate log array
        if (currentType === 'err') {
          errLogs.push(line);
        } else {
          outLogs.push(line);
        }
      }
    } catch (cmdError) {
      // If pm2 logs command fails, try reading log files directly
      console.log('PM2 logs command failed, trying file access:', cmdError.message);

      try {
        // Get PM2 home directory
        let pm2Home = '/root/.pm2';
        if (targetUser !== 'root' && targetUser !== 'admin') {
          pm2Home = `/home/${targetUser}/.pm2`;
        }

        // Read stdout log
        const outLogPath = `${pm2Home}/logs/*-out-${id}.log`;
        const errLogPath = `${pm2Home}/logs/*-error-${id}.log`;

        // Use tail to get last N lines from log files
        try {
          const outFiles = execSync(`ls ${pm2Home}/logs/*-out*.log 2>/dev/null | head -5`, { encoding: 'utf8' }).trim().split('\n');
          for (const file of outFiles) {
            if (file && fs.existsSync(file)) {
              const content = execSync(`tail -n ${numLines} "${file}" 2>/dev/null`, { encoding: 'utf8' });
              outLogs.push(...content.split('\n').filter(l => l.trim()));
            }
          }
        } catch (e) { /* ignore */ }

        try {
          const errFiles = execSync(`ls ${pm2Home}/logs/*-error*.log 2>/dev/null | head -5`, { encoding: 'utf8' }).trim().split('\n');
          for (const file of errFiles) {
            if (file && fs.existsSync(file)) {
              const content = execSync(`tail -n ${numLines} "${file}" 2>/dev/null`, { encoding: 'utf8' });
              errLogs.push(...content.split('\n').filter(l => l.trim()));
            }
          }
        } catch (e) { /* ignore */ }
      } catch (fileError) {
        console.error('File access also failed:', fileError.message);
      }
    }

    // Limit and return
    res.json({
      out_logs: outLogs.slice(-numLines),
      err_logs: errLogs.slice(-numLines)
    });
  } catch (error) {
    console.error('Get PM2 logs error:', error);
    res.json({ out_logs: [], err_logs: [], error: error.message });
  }
});

/**
 * POST /api/pm2/bulk
 * Bulk action on PM2 processes
 */
router.post('/bulk', async (req, res) => {
  try {
    const { action, processes } = req.body;
    const user = req.user;
    const isAdmin = user.role === 'admin';

    if (!action || !processes || !Array.isArray(processes)) {
      return res.status(400).json({ error: 'Action and processes are required' });
    }

    const allowedActions = ['restart', 'stop', 'delete'];
    if (!allowedActions.includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    const results = [];
    for (const proc of processes) {
      const [username, id] = proc.split(':');
      const targetUser = isAdmin ? username : user.user;

      try {
        switch (action) {
          case 'restart':
            await execHestia('v-restart-pm2-app', [targetUser, id]);
            break;
          case 'stop':
            await execHestia('v-stop-pm2-app', [targetUser, id]);
            break;
          case 'delete':
            await execHestia('v-delete-pm2-app', [targetUser, id]);
            break;
        }
        results.push({ process: proc, success: true });
      } catch (e) {
        results.push({ process: proc, success: false, error: e.message });
      }
    }

    res.json({ success: true, results });
  } catch (error) {
    console.error('Bulk PM2 action error:', error);
    res.status(500).json({ error: error.message || 'Failed to perform bulk action' });
  }
});

export default router;
