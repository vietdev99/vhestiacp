import { Router } from 'express';
import { execHestia, execHestiaJson, execHestiaCheck } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/users
 * List all users (admin only)
 */
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const data = await execHestiaJson('v-list-users', []);

    // Transform to array with username as property
    const users = Object.entries(data).map(([username, info]) => ({
      username,
      ...info
    }));

    res.json({ users });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/users/:username
 * Get single user info
 */
router.get('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Non-admin can only view their own profile
    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = await execHestiaJson('v-list-user', [username]);
    const user = data[username];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: { username, ...user } });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

/**
 * POST /api/users
 * Create new user (admin only)
 */
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      username,
      password,
      email,
      package: pkg = 'default',
      name = ''
    } = req.body;

    if (!username || !password || !email) {
      return res.status(400).json({ error: 'Username, password and email are required' });
    }

    // Validate username format
    if (!/^[a-z0-9_]+$/.test(username)) {
      return res.status(400).json({ error: 'Username can only contain lowercase letters, numbers and underscores' });
    }

    // Create user
    await execHestia('v-add-user', [username, password, email, pkg, name]);

    res.json({ success: true, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: error.message || 'Failed to create user' });
  }
});

/**
 * PUT /api/users/:username
 * Update user
 */
router.put('/:username', async (req, res) => {
  try {
    const { username } = req.params;

    // Non-admin can only update their own profile
    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { password, email, name, package: pkg, language, shell, role, ns1, ns2, ns3, ns4 } = req.body;

    // Update password if provided
    if (password) {
      await execHestia('v-change-user-password', [username, password]);
    }

    // Update contact email
    if (email) {
      await execHestia('v-change-user-contact', [username, email]);
    }

    // Update name
    if (name !== undefined) {
      await execHestia('v-change-user-name', [username, name]);
    }

    // Update package (admin only)
    if (pkg && req.user.role === 'admin') {
      await execHestia('v-change-user-package', [username, pkg]);
    }

    // Update language
    if (language) {
      await execHestia('v-change-user-language', [username, language]);
    }

    // Update shell (admin only)
    if (shell && req.user.role === 'admin') {
      await execHestia('v-change-user-shell', [username, shell]);
    }

    // Update role (admin only, not for admin user)
    if (role && req.user.role === 'admin' && username !== 'admin') {
      await execHestia('v-change-user-role', [username, role]);
    }

    // Update nameservers (admin only)
    if (req.user.role === 'admin') {
      const ns = [ns1, ns2, ns3, ns4].filter(n => n).join(',');
      if (ns) {
        await execHestia('v-change-user-ns', [username, ns]);
      }
    }

    res.json({ success: true, message: 'User updated successfully' });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: error.message || 'Failed to update user' });
  }
});

/**
 * DELETE /api/users/:username
 * Delete user (admin only)
 */
router.delete('/:username', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    // Prevent deleting admin user
    if (username === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }

    // Prevent self-deletion
    if (username === req.user.user) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    await execHestia('v-delete-user', [username]);

    res.json({ success: true, message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user' });
  }
});

/**
 * POST /api/users/:username/suspend
 * Suspend user (admin only)
 */
router.post('/:username/suspend', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    if (username === 'admin') {
      return res.status(400).json({ error: 'Cannot suspend admin user' });
    }

    await execHestia('v-suspend-user', [username]);

    res.json({ success: true, message: 'User suspended successfully' });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend user' });
  }
});

/**
 * POST /api/users/:username/unsuspend
 * Unsuspend user (admin only)
 */
router.post('/:username/unsuspend', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    await execHestia('v-unsuspend-user', [username]);

    res.json({ success: true, message: 'User unsuspended successfully' });
  } catch (error) {
    console.error('Unsuspend user error:', error);
    res.status(500).json({ error: error.message || 'Failed to unsuspend user' });
  }
});

/**
 * GET /api/users/:username/stats
 * Get user statistics
 */
router.get('/:username/stats', async (req, res) => {
  try {
    const { username } = req.params;

    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = await execHestiaJson('v-list-user', [username]);
    const user = data[username];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      stats: {
        disk: {
          used: user.U_DISK,
          quota: user.DISK_QUOTA
        },
        bandwidth: {
          used: user.U_BANDWIDTH,
          limit: user.BANDWIDTH
        },
        domains: {
          web: user.U_WEB_DOMAINS,
          dns: user.U_DNS_DOMAINS,
          mail: user.U_MAIL_DOMAINS
        },
        databases: user.U_DATABASES,
        cron: user.U_CRON_JOBS,
        backups: user.U_BACKUPS
      }
    });
  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({ error: 'Failed to get user stats' });
  }
});

/**
 * GET /api/users/:username/logs
 * Get user action logs
 */
router.get('/:username/logs', async (req, res) => {
  try {
    const { username } = req.params;
    const { type = 'history' } = req.query;

    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let logs = [];

    if (type === 'login') {
      // Get login history
      const data = await execHestiaJson('v-list-user-log', [username]);
      logs = Object.values(data || {}).reverse(); // Newest first
    } else {
      // Get action history
      const data = await execHestiaJson('v-list-user-log', [username]);
      logs = Object.values(data || {}).reverse(); // Newest first
    }

    res.json({ logs });
  } catch (error) {
    console.error('Get user logs error:', error);
    res.status(500).json({ error: 'Failed to get user logs' });
  }
});

/**
 * GET /api/users/:username/ssh-keys
 * Get user SSH keys
 */
router.get('/:username/ssh-keys', async (req, res) => {
  try {
    const { username } = req.params;

    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const data = await execHestiaJson('v-list-user-ssh-key', [username]);
    const keys = Object.entries(data || {}).map(([id, key]) => ({
      id,
      ...key
    }));

    res.json({ keys });
  } catch (error) {
    console.error('Get SSH keys error:', error);
    res.status(500).json({ error: 'Failed to get SSH keys' });
  }
});

/**
 * POST /api/users/:username/ssh-keys
 * Add SSH key
 */
router.post('/:username/ssh-keys', async (req, res) => {
  try {
    const { username } = req.params;
    const { key, name } = req.body;

    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    if (!key) {
      return res.status(400).json({ error: 'SSH key is required' });
    }

    // v-add-user-ssh-key USER KEY [NAME]
    const args = [username, key];
    if (name) args.push(name);

    await execHestia('v-add-user-ssh-key', args);

    res.json({ success: true, message: 'SSH key added successfully' });
  } catch (error) {
    console.error('Add SSH key error:', error);
    res.status(500).json({ error: error.message || 'Failed to add SSH key' });
  }
});

/**
 * DELETE /api/users/:username/ssh-keys/:keyId
 * Delete SSH key
 */
router.delete('/:username/ssh-keys/:keyId', async (req, res) => {
  try {
    const { username, keyId } = req.params;

    if (req.user.role !== 'admin' && req.user.user !== username) {
      return res.status(403).json({ error: 'Access denied' });
    }

    await execHestia('v-delete-user-ssh-key', [username, keyId]);

    res.json({ success: true, message: 'SSH key removed successfully' });
  } catch (error) {
    console.error('Delete SSH key error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete SSH key' });
  }
});

export default router;
