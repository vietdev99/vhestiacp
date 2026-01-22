import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/vhestia';

/**
 * GET /api/packages
 * List all packages (admin only)
 */
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const data = await execHestiaJson('v-list-user-packages', []);

    // Transform to array with name as property
    const packages = Object.entries(data || {}).map(([name, info]) => ({
      name,
      ...info
    }));

    res.json({ packages });
  } catch (error) {
    console.error('List packages error:', error);
    res.status(500).json({ error: 'Failed to list packages' });
  }
});

/**
 * GET /api/packages/:name
 * Get single package info
 */
router.get('/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const data = await execHestiaJson('v-list-user-package', [name]);
    const pkg = data[name];

    if (!pkg) {
      return res.status(404).json({ error: 'Package not found' });
    }

    res.json({ package: { name, ...pkg } });
  } catch (error) {
    console.error('Get package error:', error);
    res.status(500).json({ error: 'Failed to get package' });
  }
});

/**
 * POST /api/packages
 * Create new package (admin only)
 */
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const {
      name,
      webDomains = 'unlimited',
      webAliases = 'unlimited',
      dnsDomains = 'unlimited',
      dnsRecords = 'unlimited',
      mailDomains = 'unlimited',
      mailAccounts = 'unlimited',
      databases = 'unlimited',
      cronJobs = 'unlimited',
      diskQuota = 'unlimited',
      bandwidth = 'unlimited',
      backups = '1',
      ns1 = '',
      ns2 = '',
      shell = 'nologin',
      webTemplate = 'default',
      proxyTemplate = 'default',
      dnsTemplate = 'default'
    } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Package name is required' });
    }

    // Validate package name
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Package name can only contain letters, numbers, dashes and underscores' });
    }

    // Build args for v-add-user-package
    // v-add-user-package PACKAGE WEB_TEMPLATE BACKEND_TEMPLATE PROXY_TEMPLATE DNS_TEMPLATE WEB_DOMAINS WEB_ALIASES DNS_DOMAINS DNS_RECORDS MAIL_DOMAINS MAIL_ACCOUNTS DATABASES CRON_JOBS DISK_QUOTA BANDWIDTH NS SHELL BACKUPS
    await execHestia('v-add-user-package', [
      name,
      webTemplate,
      'default', // backend template
      proxyTemplate,
      dnsTemplate,
      webDomains,
      webAliases,
      dnsDomains,
      dnsRecords,
      mailDomains,
      mailAccounts,
      databases,
      cronJobs,
      diskQuota,
      bandwidth,
      `${ns1},${ns2}`.replace(/^,|,$/g, ''),
      shell,
      backups
    ]);

    res.json({ success: true, message: 'Package created successfully' });
  } catch (error) {
    console.error('Create package error:', error);
    res.status(500).json({ error: error.message || 'Failed to create package' });
  }
});

/**
 * PUT /api/packages/:name
 * Update package (admin only)
 */
router.put('/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const updates = req.body;

    // Update each field individually
    const fieldMap = {
      webDomains: 'WEB_DOMAINS',
      webAliases: 'WEB_ALIASES',
      dnsDomains: 'DNS_DOMAINS',
      dnsRecords: 'DNS_RECORDS',
      mailDomains: 'MAIL_DOMAINS',
      mailAccounts: 'MAIL_ACCOUNTS',
      databases: 'DATABASES',
      cronJobs: 'CRON_JOBS',
      diskQuota: 'DISK_QUOTA',
      bandwidth: 'BANDWIDTH',
      backups: 'BACKUPS',
      backupsIncremental: 'BACKUPS_INCREMENTAL',
      shell: 'SHELL',
      webTemplate: 'WEB_TEMPLATE',
      backendTemplate: 'BACKEND_TEMPLATE',
      dnsTemplate: 'DNS_TEMPLATE',
      rateLimit: 'RATE_LIMIT',
      ns: 'NS'
    };

    for (const [key, hestiaKey] of Object.entries(fieldMap)) {
      if (updates[key] !== undefined) {
        try {
          await execHestia('v-change-user-package-value', [name, hestiaKey, updates[key]]);
        } catch (e) {
          console.warn(`Failed to update ${hestiaKey}:`, e.message);
        }
      }
    }

    res.json({ success: true, message: 'Package updated successfully' });
  } catch (error) {
    console.error('Update package error:', error);
    res.status(500).json({ error: error.message || 'Failed to update package' });
  }
});

/**
 * DELETE /api/packages/:name
 * Delete package (admin only)
 */
router.delete('/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;

    // Prevent deleting default and system packages
    if (name === 'default' || name === 'system') {
      return res.status(400).json({ error: 'Cannot delete system packages' });
    }

    await execHestia('v-delete-user-package', [name]);

    res.json({ success: true, message: 'Package deleted successfully' });
  } catch (error) {
    console.error('Delete package error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete package' });
  }
});

export default router;
