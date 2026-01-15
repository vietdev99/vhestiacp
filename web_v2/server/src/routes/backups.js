import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';

const router = Router();

/**
 * GET /api/backups
 * List backups for current user
 */
router.get('/', async (req, res) => {
  try {
    const user = req.user;
    const result = await execHestiaJson('v-list-user-backups', [user.user]);

    // Transform to array format
    const backups = Object.entries(result || {}).map(([key, data]) => ({
      backup: key,
      ...data
    }));

    res.json({ backups });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({ error: 'Failed to list backups' });
  }
});

/**
 * POST /api/backups
 * Create a new backup for current user
 */
router.post('/', async (req, res) => {
  try {
    const user = req.user;

    // Schedule backup - this runs in background
    await execHestia('v-schedule-user-backup', [user.user]);

    res.json({ success: true, message: 'Backup scheduled successfully' });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to create backup' });
  }
});

/**
 * GET /api/backups/:backup/download
 * Download a backup
 */
router.get('/:backup/download', async (req, res) => {
  try {
    const user = req.user;
    const { backup } = req.params;

    // Get download link
    const result = await execHestia('v-download-user-backup', [user.user, backup]);

    // Return download URL or file path
    res.json({ success: true, downloadPath: result.trim() });
  } catch (error) {
    console.error('Download backup error:', error);
    res.status(500).json({ error: 'Failed to get backup download' });
  }
});

/**
 * DELETE /api/backups/:backup
 * Delete a backup
 */
router.delete('/:backup', async (req, res) => {
  try {
    const user = req.user;
    const { backup } = req.params;

    await execHestia('v-delete-user-backup', [user.user, backup]);

    res.json({ success: true, message: 'Backup deleted successfully' });
  } catch (error) {
    console.error('Delete backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete backup' });
  }
});

/**
 * POST /api/backups/:backup/restore
 * Restore a backup
 */
router.post('/:backup/restore', async (req, res) => {
  try {
    const user = req.user;
    const { backup } = req.params;
    const { web, dns, mail, db, cron, udir } = req.body;

    // Build restore command with selected components
    const args = [user.user, backup];
    if (web) args.push('web');
    if (dns) args.push('dns');
    if (mail) args.push('mail');
    if (db) args.push('db');
    if (cron) args.push('cron');
    if (udir) args.push('udir');

    await execHestia('v-schedule-user-restore', args);

    res.json({ success: true, message: 'Restore scheduled successfully' });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({ error: error.message || 'Failed to restore backup' });
  }
});

/**
 * GET /api/backups/settings
 * Get backup settings
 */
router.get('/settings', async (req, res) => {
  try {
    // Get backup settings from hestia.conf
    const result = await execHestiaJson('v-list-sys-config', []);
    
    res.json({
      backupDir: result.BACKUP || '/backup',
      backups: result.BACKUPS || 3,
      backupGzip: result.BACKUP_GZIP || 5,
      backupMode: result.BACKUP_MODE || 'local',
      backupRemote: result.BACKUP_REMOTE || '',
      backupRemoteType: result.BACKUP_REMOTE_TYPE || ''
    });
  } catch (error) {
    console.error('Get backup settings error:', error);
    res.status(500).json({ error: 'Failed to get backup settings' });
  }
});

/**
 * POST /api/backups/settings
 * Update backup settings
 */
router.post('/settings', async (req, res) => {
  try {
    const { backupDir, backups, backupGzip, backupMode, backupRemote, backupRemoteType } = req.body;

    // Update backup directory
    if (backupDir) {
      await execHestia('v-change-sys-config-value', ['BACKUP', backupDir]);
    }

    // Update number of backups
    if (backups !== undefined) {
      await execHestia('v-change-sys-config-value', ['BACKUPS', String(backups)]);
    }

    // Update compression level
    if (backupGzip !== undefined) {
      await execHestia('v-change-sys-config-value', ['BACKUP_GZIP', String(backupGzip)]);
    }

    // Update backup mode (local/rclone)
    if (backupMode) {
      await execHestia('v-change-sys-config-value', ['BACKUP_MODE', backupMode]);
    }

    // Update remote (rclone remote name)
    if (backupRemote !== undefined) {
      await execHestia('v-change-sys-config-value', ['BACKUP_REMOTE', backupRemote]);
    }

    // Update remote type
    if (backupRemoteType !== undefined) {
      await execHestia('v-change-sys-config-value', ['BACKUP_REMOTE_TYPE', backupRemoteType]);
    }

    res.json({ success: true, message: 'Backup settings updated successfully' });
  } catch (error) {
    console.error('Update backup settings error:', error);
    res.status(500).json({ error: error.message || 'Failed to update backup settings' });
  }
});

/**
 * GET /api/backups/rclone-remotes
 * Get list of available rclone remotes
 */
router.get('/rclone-remotes', async (req, res) => {
  try {
    const result = await execHestiaJson('v-list-sys-rclone', []);
    
    // Transform to array
    const remotes = Object.entries(result || {}).map(([name, data]) => ({
      name,
      type: data?.TYPE || 'unknown',
      ...data
    }));
    
    res.json({ remotes });
  } catch (error) {
    console.error('Get rclone remotes error:', error);
    res.json({ remotes: [] }); // Return empty array if no remotes
  }
});

export default router;
