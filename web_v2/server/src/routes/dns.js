import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/dns
 * List all DNS zones for the user
 */
router.get('/', async (req, res) => {
  try {
    const username = req.user.user;
    const zones = await execHestiaJson('v-list-dns-domains', [username]);

    // Convert to array format
    const zonesArray = Object.entries(zones || {}).map(([domain, data]) => ({
      domain,
      ...data
    }));

    res.json({ zones: zonesArray });
  } catch (error) {
    console.error('List DNS zones error:', error);
    res.status(500).json({ error: 'Failed to list DNS zones' });
  }
});

/**
 * GET /api/dns/:domain
 * Get DNS zone details
 */
router.get('/:domain', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;

    const zones = await execHestiaJson('v-list-dns-domains', [username]);
    const zone = zones?.[domain];

    if (!zone) {
      return res.status(404).json({ error: 'DNS zone not found' });
    }

    // Get DNS records
    const records = await execHestiaJson('v-list-dns-records', [username, domain]);
    const recordsArray = Object.entries(records || {}).map(([id, data]) => ({
      id,
      ...data
    }));

    res.json({
      domain,
      ...zone,
      records: recordsArray
    });
  } catch (error) {
    console.error('Get DNS zone error:', error);
    res.status(500).json({ error: 'Failed to get DNS zone' });
  }
});

/**
 * POST /api/dns
 * Create new DNS zone
 */
router.post('/', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain, ip, template, exp, ttl, ns1, ns2, ns3, ns4 } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Build command arguments
    // v-add-dns-domain USER DOMAIN IP [NS1] [NS2] [NS3] [NS4] [NS5] [NS6] [NS7] [NS8] [RESTART]
    const args = [username, domain];

    if (ip) args.push(ip);
    else args.push('');

    // Add nameservers
    args.push(ns1 || '');
    args.push(ns2 || '');
    args.push(ns3 || '');
    args.push(ns4 || '');
    args.push(''); // ns5
    args.push(''); // ns6
    args.push(''); // ns7
    args.push(''); // ns8
    args.push('yes'); // restart

    await execHestia('v-add-dns-domain', args);

    // Apply template if specified
    if (template && template !== 'default') {
      try {
        await execHestia('v-change-dns-domain-tpl', [username, domain, template]);
      } catch (e) {
        console.error('Failed to apply DNS template:', e);
      }
    }

    // Set TTL if specified
    if (ttl && ttl !== '14400') {
      try {
        await execHestia('v-change-dns-domain-ttl', [username, domain, ttl]);
      } catch (e) {
        console.error('Failed to set DNS TTL:', e);
      }
    }

    // Set expiration if specified
    if (exp) {
      try {
        await execHestia('v-change-dns-domain-exp', [username, domain, exp]);
      } catch (e) {
        console.error('Failed to set DNS expiration:', e);
      }
    }

    res.json({ success: true, domain });
  } catch (error) {
    console.error('Create DNS zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to create DNS zone' });
  }
});

/**
 * PUT /api/dns/:domain
 * Update DNS zone
 */
router.put('/:domain', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;
    const { ip, template, exp, ttl } = req.body;

    // Update IP if changed
    if (ip) {
      await execHestia('v-change-dns-domain-ip', [username, domain, ip]);
    }

    // Update template if changed
    if (template) {
      await execHestia('v-change-dns-domain-tpl', [username, domain, template]);
    }

    // Update TTL if changed
    if (ttl) {
      await execHestia('v-change-dns-domain-ttl', [username, domain, ttl]);
    }

    // Update expiration if changed
    if (exp) {
      await execHestia('v-change-dns-domain-exp', [username, domain, exp]);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Update DNS zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to update DNS zone' });
  }
});

/**
 * DELETE /api/dns/:domain
 * Delete DNS zone
 */
router.delete('/:domain', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;

    await execHestia('v-delete-dns-domain', [username, domain]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete DNS zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete DNS zone' });
  }
});

/**
 * POST /api/dns/:domain/suspend
 * Suspend DNS zone
 */
router.post('/:domain/suspend', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;

    await execHestia('v-suspend-dns-domain', [username, domain]);

    res.json({ success: true });
  } catch (error) {
    console.error('Suspend DNS zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend DNS zone' });
  }
});

/**
 * POST /api/dns/:domain/unsuspend
 * Unsuspend DNS zone
 */
router.post('/:domain/unsuspend', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;

    await execHestia('v-unsuspend-dns-domain', [username, domain]);

    res.json({ success: true });
  } catch (error) {
    console.error('Unsuspend DNS zone error:', error);
    res.status(500).json({ error: error.message || 'Failed to unsuspend DNS zone' });
  }
});

/**
 * POST /api/dns/:domain/records
 * Add DNS record
 */
router.post('/:domain/records', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain } = req.params;
    const { record, type, value, priority } = req.body;

    if (!record || !type || !value) {
      return res.status(400).json({ error: 'Record, type, and value are required' });
    }

    const args = [username, domain, record, type, value];
    if (priority) args.push(priority);

    await execHestia('v-add-dns-record', args);

    res.json({ success: true });
  } catch (error) {
    console.error('Add DNS record error:', error);
    res.status(500).json({ error: error.message || 'Failed to add DNS record' });
  }
});

/**
 * DELETE /api/dns/:domain/records/:id
 * Delete DNS record
 */
router.delete('/:domain/records/:id', async (req, res) => {
  try {
    const username = req.user.user;
    const { domain, id } = req.params;

    await execHestia('v-delete-dns-record', [username, domain, id]);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete DNS record error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete DNS record' });
  }
});

export default router;
