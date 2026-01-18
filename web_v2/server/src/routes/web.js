import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { execHestia, execHestiaJson } from '../utils/hestia.js';

const router = Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';

/**
 * GET /api/web
 * List web domains for current user (or all for admin with ?all=true)
 */
router.get('/', async (req, res) => {
  try {
    const username = req.user.role === 'admin' && req.query.user
      ? req.query.user
      : req.user.user;

    const data = await execHestiaJson('v-list-web-domains', [username]);

    // Transform to array with domain as property
    const domains = Object.entries(data).map(([domain, info]) => ({
      domain,
      ...info
    }));

    res.json({ domains });
  } catch (error) {
    console.error('List web domains error:', error);
    res.status(500).json({ error: 'Failed to list web domains' });
  }
});

/**
 * GET /api/web/:domain
 * Get single web domain info
 */
router.get('/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.role === 'admin' && req.query.user
      ? req.query.user
      : req.user.user;

    const data = await execHestiaJson('v-list-web-domain', [username, domain]);
    const domainInfo = data[domain];

    if (!domainInfo) {
      return res.status(404).json({ error: 'Domain not found' });
    }

    res.json({ domain: { name: domain, ...domainInfo } });
  } catch (error) {
    console.error('Get web domain error:', error);
    res.status(500).json({ error: 'Failed to get web domain' });
  }
});

/**
 * POST /api/web
 * Add new web domain
 */
router.post('/', async (req, res) => {
  try {
    const username = req.user.user;
    const {
      domain,
      ip,
      aliases = '',
      proxySupport = 'yes',
      proxyExtensions = 'jpg,jpeg,gif,png,ico,svg,css,zip,tgz,gz,rar,bz2,doc,xls,exe,pdf,ppt,txt,odt,ods,odp,odf,tar,wav,bmp,rtf,js,mp3,avi,mpeg,flv,woff,woff2',
      stats = '',
      statsAuth = ''
    } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Validate domain format
    if (!/^[a-zA-Z0-9][a-zA-Z0-9-_.]+\.[a-zA-Z]{2,}$/.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // v-add-web-domain USER DOMAIN [IP] [ALIASES] [PROXY_EXTENSIONS] [RESTART]
    const args = [username, domain];
    if (ip) args.push(ip);

    await execHestia('v-add-web-domain', args);

    // Add aliases if provided
    if (aliases) {
      const aliasList = aliases.split(',').map(a => a.trim()).filter(a => a);
      for (const alias of aliasList) {
        try {
          await execHestia('v-add-web-domain-alias', [username, domain, alias]);
        } catch (e) {
          console.warn(`Failed to add alias ${alias}:`, e.message);
        }
      }
    }

    res.json({ success: true, message: 'Domain created successfully' });
  } catch (error) {
    console.error('Create web domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to create web domain' });
  }
});

/**
 * PUT /api/web/:domain
 * Update web domain
 */
router.put('/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;
    const {
      ip,
      aliases,
      stats,
      webTemplate,
      backendTemplate,
      fastcgiCache,
      customDocRoot
    } = req.body;

    // Get current domain info to compare IP
    const currentData = await execHestiaJson('v-list-web-domain', [username, domain]);
    const currentInfo = currentData[domain];
    const currentIp = currentInfo?.IP || '';

    // Change IP if different from current
    // Note: Frontend sends ip="" when selecting "All IP Addresses (*)"
    const effectiveIp = (ip === '' || ip === '*') ? '*' : ip;
    const effectiveCurrentIp = (currentIp === '' || currentIp === '*') ? '*' : currentIp;

    if (ip !== undefined && effectiveIp !== effectiveCurrentIp) {
      if (effectiveIp === '*') {
        // VHestiaCP: Support wildcard IP to bind to all interfaces
        await execHestia('v-change-web-domain-ip', [username, domain, '*']);
      } else {
        // Check if the IP exists in system
        const ipsDir = path.join(HESTIA_DIR, 'data/ips');
        const ipExists = fs.existsSync(path.join(ipsDir, effectiveIp));
        if (ipExists) {
          await execHestia('v-change-web-domain-ip', [username, domain, effectiveIp]);
        }
      }
    }

    // Change web template
    if (webTemplate) {
      try {
        await execHestia('v-change-web-domain-tpl', [username, domain, webTemplate]);
      } catch (e) {
        console.warn('Failed to change web template:', e.message);
      }
    }

    // Change backend template
    if (backendTemplate) {
      try {
        await execHestia('v-change-web-domain-backend-tpl', [username, domain, backendTemplate]);
      } catch (e) {
        console.warn('Failed to change backend template:', e.message);
      }
    }

    // Change web statistics
    if (stats !== undefined) {
      try {
        if (stats === 'none' || !stats) {
          await execHestia('v-delete-web-domain-stats', [username, domain]);
        } else {
          await execHestia('v-add-web-domain-stats', [username, domain, stats]);
        }
      } catch (e) {
        console.warn('Failed to change web stats:', e.message);
      }
    }

    // FastCGI cache
    if (fastcgiCache !== undefined) {
      try {
        if (fastcgiCache === 'yes') {
          await execHestia('v-add-fastcgi-cache', [username, domain]);
        } else {
          await execHestia('v-delete-fastcgi-cache', [username, domain]);
        }
      } catch (e) {
        console.warn('Failed to change fastcgi cache:', e.message);
      }
    }

    // Custom document root
    if (customDocRoot !== undefined) {
      try {
        if (customDocRoot) {
          await execHestia('v-change-web-domain-docroot', [username, domain, customDocRoot]);
        } else {
          await execHestia('v-delete-web-domain-docroot', [username, domain]);
        }
      } catch (e) {
        console.warn('Failed to change docroot:', e.message);
      }
    }

    res.json({ success: true, message: 'Domain updated successfully' });
  } catch (error) {
    console.error('Update web domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to update web domain' });
  }
});

/**
 * DELETE /api/web/:domain
 * Delete web domain
 */
router.delete('/:domain', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;

    await execHestia('v-delete-web-domain', [username, domain]);

    res.json({ success: true, message: 'Domain deleted successfully' });
  } catch (error) {
    console.error('Delete web domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete web domain' });
  }
});

/**
 * POST /api/web/:domain/suspend
 * Suspend web domain
 */
router.post('/:domain/suspend', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;

    await execHestia('v-suspend-web-domain', [username, domain]);

    res.json({ success: true, message: 'Domain suspended successfully' });
  } catch (error) {
    console.error('Suspend web domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend web domain' });
  }
});

/**
 * POST /api/web/:domain/unsuspend
 * Unsuspend web domain
 */
router.post('/:domain/unsuspend', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;

    await execHestia('v-unsuspend-web-domain', [username, domain]);

    res.json({ success: true, message: 'Domain unsuspended successfully' });
  } catch (error) {
    console.error('Unsuspend web domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to unsuspend web domain' });
  }
});

/**
 * POST /api/web/:domain/ssl
 * Enable/configure SSL for domain
 */
router.post('/:domain/ssl', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;
    const { letsencrypt = true } = req.body;

    if (letsencrypt) {
      // Add Let's Encrypt SSL
      await execHestia('v-add-letsencrypt-domain', [username, domain]);
    }

    res.json({ success: true, message: 'SSL enabled successfully' });
  } catch (error) {
    console.error('Enable SSL error:', error);
    res.status(500).json({ error: error.message || 'Failed to enable SSL' });
  }
});

/**
 * DELETE /api/web/:domain/ssl
 * Disable SSL for domain
 */
router.delete('/:domain/ssl', async (req, res) => {
  try {
    const { domain } = req.params;
    const username = req.user.user;

    await execHestia('v-delete-web-domain-ssl', [username, domain]);

    res.json({ success: true, message: 'SSL disabled successfully' });
  } catch (error) {
    console.error('Disable SSL error:', error);
    res.status(500).json({ error: error.message || 'Failed to disable SSL' });
  }
});

/**
 * GET /api/web/:domain/logs
 * Get web domain access/error logs
 */
router.get('/:domain/logs', async (req, res) => {
  try {
    const { domain } = req.params;
    const { type = 'access', lines = 100 } = req.query;
    const username = req.user.user;

    // Determine log file path
    const logFile = type === 'error'
      ? `/var/log/apache2/domains/${domain}.error.log`
      : `/var/log/apache2/domains/${domain}.log`;

    // Alternative nginx path
    const nginxLogFile = type === 'error'
      ? `/var/log/nginx/domains/${domain}.error.log`
      : `/var/log/nginx/domains/${domain}.log`;

    let logPath = logFile;
    if (!fs.existsSync(logFile) && fs.existsSync(nginxLogFile)) {
      logPath = nginxLogFile;
    }

    if (!fs.existsSync(logPath)) {
      return res.json({ logs: '' });
    }

    // Read last N lines
    const { execSync } = await import('child_process');
    const logs = execSync(`tail -n ${parseInt(lines)} "${logPath}"`, { encoding: 'utf8' });

    res.json({ logs });
  } catch (error) {
    console.error('Get web logs error:', error);
    res.status(500).json({ error: 'Failed to get logs' });
  }
});

export default router;
