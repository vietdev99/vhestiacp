import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

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

    // Get logs using v-list-pm2-logs or direct file access
    const result = await execHestiaJson('v-list-pm2-logs', [targetUser, id, lines]);
    res.json(result);
  } catch (error) {
    console.error('Get PM2 logs error:', error);
    // Return empty logs on error
    res.json({ out_logs: [], err_logs: [] });
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
