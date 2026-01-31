import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';

const router = Router();

/**
 * GET /api/cron
 * List all cron jobs for the user
 * If user is admin, also include root system cron jobs
 */
router.get('/', async (req, res) => {
  try {
    const username = req.user.user;
    const isAdmin = req.user.user === 'admin';

    const jobs = await execHestiaJson('v-list-cron-jobs', [username]);

    // Get user info to check CRON_REPORTS status
    const userInfo = await execHestiaJson('v-list-user', [username]);
    const cronReports = userInfo?.[username]?.CRON_REPORTS === 'yes';

    // Convert to array format
    let jobsArray = Object.entries(jobs || {}).map(([id, data]) => ({
      JOB: id,
      ...data,
      USER: username
    }));

    // If admin, also fetch root cron jobs
    if (isAdmin && username !== 'root') {
      try {
        const rootJobs = await execHestiaJson('v-list-cron-jobs', ['root']);
        const rootJobsArray = Object.entries(rootJobs || {}).map(([id, data]) => ({
          JOB: id,
          ...data,
          USER: 'root'
        }));
        jobsArray = [...jobsArray, ...rootJobsArray];
      } catch (e) {
        // Root cron jobs might not be accessible, just skip
        console.warn('Failed to list root cron jobs:', e.message);
      }
    }

    res.json({ jobs: jobsArray, notifications: cronReports });
  } catch (error) {
    console.error('List cron jobs error:', error);
    res.status(500).json({ error: 'Failed to list cron jobs' });
  }
});

/**
 * GET /api/cron/:id
 * Get single cron job
 */
router.get('/:id', async (req, res) => {
  try {
    const username = req.user.user;
    const { id } = req.params;

    const jobs = await execHestiaJson('v-list-cron-jobs', [username]);
    const job = jobs?.[id];

    if (!job) {
      return res.status(404).json({ error: 'Cron job not found' });
    }

    res.json({
      JOB: id,
      ...job
    });
  } catch (error) {
    console.error('Get cron job error:', error);
    res.status(500).json({ error: 'Failed to get cron job' });
  }
});

/**
 * POST /api/cron
 * Create new cron job
 * v-add-cron-job USER MIN HOUR DAY MONTH WDAY CMD [JOB] [RESTART]
 */
router.post('/', async (req, res) => {
  try {
    const username = req.user.user;
    const { min, hour, day, month, wday, cmd } = req.body;

    if (!cmd) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const args = [
      username,
      min || '*',
      hour || '*',
      day || '*',
      month || '*',
      wday || '*',
      cmd
    ];

    await execHestia('v-add-cron-job', args);

    res.json({ success: true });
  } catch (error) {
    console.error('Create cron job error:', error);
    res.status(500).json({ error: error.message || 'Failed to create cron job' });
  }
});

/**
 * PUT /api/cron/:id
 * Update cron job
 * v-change-cron-job USER JOB MIN HOUR DAY MONTH WDAY CMD
 */
router.put('/:id', async (req, res) => {
  try {
    const username = req.user.user;
    const { id } = req.params;
    const { min, hour, day, month, wday, cmd } = req.body;

    if (!cmd) {
      return res.status(400).json({ error: 'Command is required' });
    }

    const args = [
      username,
      id,
      min || '*',
      hour || '*',
      day || '*',
      month || '*',
      wday || '*',
      cmd
    ];

    await execHestia('v-change-cron-job', args);

    res.json({ success: true });
  } catch (error) {
    console.error('Update cron job error:', error);
    res.status(500).json({ error: error.message || 'Failed to update cron job' });
  }
});

/**
 * DELETE /api/cron/:id
 * Delete cron job
 */
router.delete('/:id', async (req, res) => {
  try {
    const username = req.user.user;
    const { id } = req.params;

    await execHestia('v-delete-cron-job', [username, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete cron job error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete cron job' });
  }
});

/**
 * POST /api/cron/:id/suspend
 * Suspend cron job
 */
router.post('/:id/suspend', async (req, res) => {
  try {
    const username = req.user.user;
    const { id } = req.params;

    await execHestia('v-suspend-cron-job', [username, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Suspend cron job error:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend cron job' });
  }
});

/**
 * POST /api/cron/:id/unsuspend
 * Unsuspend cron job
 */
router.post('/:id/unsuspend', async (req, res) => {
  try {
    const username = req.user.user;
    const { id } = req.params;

    await execHestia('v-unsuspend-cron-job', [username, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Unsuspend cron job error:', error);
    res.status(500).json({ error: error.message || 'Failed to unsuspend cron job' });
  }
});

/**
 * POST /api/cron/notifications/enable
 * Enable cron email notifications
 */
router.post('/notifications/enable', async (req, res) => {
  try {
    const username = req.user.user;

    await execHestia('v-add-cron-reports', [username]);

    res.json({ success: true, notifications: true });
  } catch (error) {
    console.error('Enable cron notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to enable notifications' });
  }
});

/**
 * POST /api/cron/notifications/disable
 * Disable cron email notifications
 */
router.post('/notifications/disable', async (req, res) => {
  try {
    const username = req.user.user;

    await execHestia('v-delete-cron-reports', [username]);

    res.json({ success: true, notifications: false });
  } catch (error) {
    console.error('Disable cron notifications error:', error);
    res.status(500).json({ error: error.message || 'Failed to disable notifications' });
  }
});

export default router;
