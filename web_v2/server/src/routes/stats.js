import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/stats
 * List user stats - for admin gets overall stats, for user gets their own stats
 */
router.get('/', async (req, res) => {
  try {
    const { user } = req.user;
    const isAdmin = req.user.role === 'admin';

    let stats;
    if (isAdmin) {
      // Get overall statistics for all users
      stats = await execHestiaJson('v-list-users-stats', []);
    } else {
      // Get current user's statistics
      stats = await execHestiaJson('v-list-user-stats', [user]);
    }

    // Transform to array format with month as key
    const statsArray = Object.entries(stats).map(([date, data]) => ({
      date,
      time: data.TIME,
      package: data.PACKAGE,
      ipOwned: parseInt(data.IP_OWNED) || 0,
      diskQuota: parseInt(data.DISK_QUOTA) || 0,
      uDisk: parseInt(data.U_DISK) || 0,
      uDiskDirs: parseInt(data.U_DISK_DIRS) || 0,
      uDiskWeb: parseInt(data.U_DISK_WEB) || 0,
      uDiskMail: parseInt(data.U_DISK_MAIL) || 0,
      uDiskDb: parseInt(data.U_DISK_DB) || 0,
      bandwidth: parseInt(data.BANDWIDTH) || 0,
      uBandwidth: parseInt(data.U_BANDWIDTH) || 0,
      uWebDomains: parseInt(data.U_WEB_DOMAINS) || 0,
      uWebSsl: parseInt(data.U_WEB_SSL) || 0,
      uWebAliases: parseInt(data.U_WEB_ALIASES) || 0,
      uDnsDomains: parseInt(data.U_DNS_DOMAINS) || 0,
      uDnsRecords: parseInt(data.U_DNS_RECORDS) || 0,
      uMailDomains: parseInt(data.U_MAIL_DOMAINS) || 0,
      uMailDkim: parseInt(data.U_MAIL_DKIM) || 0,
      uMailAccounts: parseInt(data.U_MAIL_ACCOUNTS) || 0,
      uDatabases: parseInt(data.U_DATABASES) || 0,
      uCronJobs: parseInt(data.U_CRON_JOBS) || 0,
      uBackups: parseInt(data.U_BACKUPS) || 0,
      uUsers: parseInt(data.U_USERS) || 0
    }));

    // Sort by date descending (newest first)
    statsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      stats: statsArray,
      isOverall: isAdmin
    });
  } catch (error) {
    console.error('List stats error:', error);
    res.status(500).json({ error: 'Failed to list statistics' });
  }
});

/**
 * GET /api/stats/user/:username
 * List stats for specific user (admin only)
 */
router.get('/user/:username', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    const stats = await execHestiaJson('v-list-user-stats', [username]);

    // Transform to array format
    const statsArray = Object.entries(stats).map(([date, data]) => ({
      date,
      time: data.TIME,
      package: data.PACKAGE,
      ipOwned: parseInt(data.IP_OWNED) || 0,
      diskQuota: parseInt(data.DISK_QUOTA) || 0,
      uDisk: parseInt(data.U_DISK) || 0,
      uDiskDirs: parseInt(data.U_DISK_DIRS) || 0,
      uDiskWeb: parseInt(data.U_DISK_WEB) || 0,
      uDiskMail: parseInt(data.U_DISK_MAIL) || 0,
      uDiskDb: parseInt(data.U_DISK_DB) || 0,
      bandwidth: parseInt(data.BANDWIDTH) || 0,
      uBandwidth: parseInt(data.U_BANDWIDTH) || 0,
      uWebDomains: parseInt(data.U_WEB_DOMAINS) || 0,
      uWebSsl: parseInt(data.U_WEB_SSL) || 0,
      uWebAliases: parseInt(data.U_WEB_ALIASES) || 0,
      uDnsDomains: parseInt(data.U_DNS_DOMAINS) || 0,
      uDnsRecords: parseInt(data.U_DNS_RECORDS) || 0,
      uMailDomains: parseInt(data.U_MAIL_DOMAINS) || 0,
      uMailDkim: parseInt(data.U_MAIL_DKIM) || 0,
      uMailAccounts: parseInt(data.U_MAIL_ACCOUNTS) || 0,
      uDatabases: parseInt(data.U_DATABASES) || 0,
      uCronJobs: parseInt(data.U_CRON_JOBS) || 0,
      uBackups: parseInt(data.U_BACKUPS) || 0
    }));

    // Sort by date descending
    statsArray.sort((a, b) => new Date(b.date) - new Date(a.date));

    res.json({
      stats: statsArray,
      username
    });
  } catch (error) {
    console.error('List user stats error:', error);
    res.status(500).json({ error: 'Failed to list user statistics' });
  }
});

/**
 * GET /api/stats/users
 * List all users for stats filter (admin only)
 */
router.get('/users', adminMiddleware, async (req, res) => {
  try {
    const users = await execHestiaJson('v-list-sys-users', []);

    res.json({ users: Object.values(users) });
  } catch (error) {
    console.error('List users error:', error);
    res.status(500).json({ error: 'Failed to list users' });
  }
});

/**
 * GET /api/stats/chart
 * Get stats data formatted for charts
 */
router.get('/chart', async (req, res) => {
  try {
    const { user } = req.user;
    const isAdmin = req.user.role === 'admin';
    const { months = 12, metric = 'bandwidth' } = req.query;

    let stats;
    if (isAdmin) {
      stats = await execHestiaJson('v-list-users-stats', []);
    } else {
      stats = await execHestiaJson('v-list-user-stats', [user]);
    }

    // Transform to chart format
    const chartData = Object.entries(stats)
      .map(([date, data]) => {
        const d = new Date(date);
        return {
          date,
          month: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          bandwidth: parseInt(data.U_BANDWIDTH) || 0,
          bandwidthQuota: parseInt(data.BANDWIDTH) || 0,
          disk: parseInt(data.U_DISK) || 0,
          diskQuota: parseInt(data.DISK_QUOTA) || 0,
          webDomains: parseInt(data.U_WEB_DOMAINS) || 0,
          mailDomains: parseInt(data.U_MAIL_DOMAINS) || 0,
          databases: parseInt(data.U_DATABASES) || 0,
          users: parseInt(data.U_USERS) || 0
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(-parseInt(months));

    res.json({
      chartData,
      metric,
      months: parseInt(months)
    });
  } catch (error) {
    console.error('Get chart data error:', error);
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

/**
 * DELETE /api/stats/user/:username
 * Delete user statistics (admin only)
 */
router.delete('/user/:username', adminMiddleware, async (req, res) => {
  try {
    const { username } = req.params;

    await execHestia('v-delete-user-stats', [username]);

    res.json({ success: true, message: 'User statistics deleted successfully' });
  } catch (error) {
    console.error('Delete user stats error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete user statistics' });
  }
});

export default router;
