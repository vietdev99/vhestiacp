import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';

const router = express.Router();
const execAsync = promisify(exec);
const HESTIA = process.env.HESTIA || '/usr/local/hestia';

// Helper function to run Hestia commands
async function runHestiaCmd(cmd) {
  try {
    const { stdout, stderr } = await execAsync(cmd);
    return { success: true, output: stdout.trim() };
  } catch (error) {
    return { success: false, error: error.message, stderr: error.stderr };
  }
}

// GET /api/mail - List all mail domains
router.get('/', async (req, res) => {
  try {
    const user = req.user.user;
    const result = await runHestiaCmd(`${HESTIA}/bin/v-list-mail-domains ${user} json`);
    
    if (!result.success) {
      return res.status(500).json({ error: 'Failed to list mail domains' });
    }

    let domains = [];
    if (result.output && result.output !== '') {
      try {
        const parsed = JSON.parse(result.output);
        domains = Object.entries(parsed).map(([domain, data]) => ({
          domain,
          ...data
        }));
      } catch (e) {
        console.error('Failed to parse mail domains:', e);
      }
    }

    res.json(domains);
  } catch (error) {
    console.error('Error listing mail domains:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mail/:domain - Get mail domain details
router.get('/:domain', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-list-mail-domain ${user} ${domain} json`);
    
    if (!result.success) {
      return res.status(404).json({ error: 'Mail domain not found' });
    }

    let domainData = null;
    if (result.output && result.output !== '') {
      try {
        const parsed = JSON.parse(result.output);
        domainData = parsed[domain] || parsed;
      } catch (e) {
        console.error('Failed to parse mail domain:', e);
      }
    }

    res.json(domainData);
  } catch (error) {
    console.error('Error getting mail domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mail - Create mail domain
router.post('/', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain, antispam = 'yes', antivirus = 'yes', dkim = 'yes' } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Validate domain format
    const domainRegex = /^[a-zA-Z0-9][a-zA-Z0-9-]{0,61}[a-zA-Z0-9]?\.[a-zA-Z]{2,}$/;
    if (!domainRegex.test(domain)) {
      return res.status(400).json({ error: 'Invalid domain format' });
    }

    // Create mail domain
    const result = await runHestiaCmd(
      `${HESTIA}/bin/v-add-mail-domain ${user} ${domain} ${antispam} ${antivirus} ${dkim}`
    );

    if (!result.success) {
      console.error('Failed to create mail domain:', result.stderr || result.error);
      return res.status(500).json({ 
        error: result.stderr?.includes('already exists') 
          ? 'Mail domain already exists'
          : 'Failed to create mail domain'
      });
    }

    res.json({ success: true, message: 'Mail domain created successfully' });
  } catch (error) {
    console.error('Error creating mail domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mail/:domain - Delete mail domain
router.delete('/:domain', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain ${user} ${domain}`);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to delete mail domain' });
    }

    res.json({ success: true, message: 'Mail domain deleted successfully' });
  } catch (error) {
    console.error('Error deleting mail domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mail/:domain - Update mail domain settings
router.put('/:domain', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;
    const { 
      antispam, 
      antivirus, 
      dkim, 
      ssl,
      letsencrypt,
      catchall, 
      rateLimit,
      webmail,
      rejectSpam
    } = req.body;

    const results = [];

    // Anti-spam
    if (antispam !== undefined) {
      if (antispam) {
        await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-antispam ${user} ${domain}`);
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-antispam ${user} ${domain}`);
      }
      results.push('antispam updated');
    }

    // Anti-virus
    if (antivirus !== undefined) {
      if (antivirus) {
        await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-antivirus ${user} ${domain}`);
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-antivirus ${user} ${domain}`);
      }
      results.push('antivirus updated');
    }

    // DKIM
    if (dkim !== undefined) {
      if (dkim) {
        await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-dkim ${user} ${domain}`);
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-dkim ${user} ${domain}`);
      }
      results.push('dkim updated');
    }

    // Reject spam
    if (rejectSpam !== undefined) {
      if (rejectSpam) {
        await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-reject ${user} ${domain}`);
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-reject ${user} ${domain}`);
      }
      results.push('reject spam updated');
    }

    // Catchall
    if (catchall !== undefined) {
      if (catchall) {
        await runHestiaCmd(`${HESTIA}/bin/v-change-mail-domain-catchall ${user} ${domain} ${catchall}`);
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-catchall ${user} ${domain}`);
      }
      results.push('catchall updated');
    }

    // Rate limit
    if (rateLimit !== undefined) {
      await runHestiaCmd(`${HESTIA}/bin/v-change-mail-domain-rate-limit ${user} ${domain} ${rateLimit}`);
      results.push('rate limit updated');
    }

    // Webmail
    if (webmail !== undefined) {
      await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-webmail ${user} ${domain} ${webmail}`);
      results.push('webmail updated');
    }

    // SSL
    if (ssl !== undefined) {
      if (ssl) {
        if (letsencrypt) {
          await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-ssl ${user} ${domain} yes`);
        } else {
          await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-ssl ${user} ${domain}`);
        }
      } else {
        await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-domain-ssl ${user} ${domain}`);
      }
      results.push('ssl updated');
    }

    res.json({ success: true, message: 'Mail domain updated', results });
  } catch (error) {
    console.error('Error updating mail domain:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mail/:domain/accounts - List mail accounts
router.get('/:domain/accounts', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-list-mail-accounts ${user} ${domain} json`);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to list mail accounts' });
    }

    let accounts = [];
    if (result.output && result.output !== '') {
      try {
        const parsed = JSON.parse(result.output);
        accounts = Object.entries(parsed).map(([account, data]) => ({
          account,
          email: `${account}@${domain}`,
          ...data
        }));
      } catch (e) {
        console.error('Failed to parse mail accounts:', e);
      }
    }

    res.json(accounts);
  } catch (error) {
    console.error('Error listing mail accounts:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mail/:domain/accounts - Create mail account
router.post('/:domain/accounts', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;
    const { account, password, quota = 'unlimited', aliases = '', forward = '' } = req.body;

    if (!account || !password) {
      return res.status(400).json({ error: 'Account and password are required' });
    }

    // Validate account format
    const accountRegex = /^[a-zA-Z0-9._-]+$/;
    if (!accountRegex.test(account)) {
      return res.status(400).json({ error: 'Invalid account format' });
    }

    const result = await runHestiaCmd(
      `${HESTIA}/bin/v-add-mail-account ${user} ${domain} ${account} "${password}" ${quota}`
    );

    if (!result.success) {
      console.error('Failed to create mail account:', result.stderr || result.error);
      return res.status(500).json({ 
        error: result.stderr?.includes('already exists') 
          ? 'Mail account already exists'
          : 'Failed to create mail account'
      });
    }

    // Add aliases if provided
    if (aliases) {
      const aliasArr = aliases.split(',').map(a => a.trim()).filter(Boolean);
      for (const alias of aliasArr) {
        await runHestiaCmd(`${HESTIA}/bin/v-add-mail-account-alias ${user} ${domain} ${account} ${alias}`);
      }
    }

    // Add forward if provided
    if (forward) {
      await runHestiaCmd(`${HESTIA}/bin/v-add-mail-account-forward ${user} ${domain} ${account} ${forward}`);
    }

    res.json({ success: true, message: 'Mail account created successfully' });
  } catch (error) {
    console.error('Error creating mail account:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/mail/:domain/accounts/:account - Update mail account
router.put('/:domain/accounts/:account', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain, account } = req.params;
    const { password, quota } = req.body;

    // Update password if provided
    if (password) {
      const result = await runHestiaCmd(
        `${HESTIA}/bin/v-change-mail-account-password ${user} ${domain} ${account} "${password}"`
      );
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to update password' });
      }
    }

    // Update quota if provided
    if (quota) {
      const result = await runHestiaCmd(
        `${HESTIA}/bin/v-change-mail-account-quota ${user} ${domain} ${account} ${quota}`
      );
      if (!result.success) {
        return res.status(500).json({ error: 'Failed to update quota' });
      }
    }

    res.json({ success: true, message: 'Mail account updated successfully' });
  } catch (error) {
    console.error('Error updating mail account:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/mail/:domain/accounts/:account - Delete mail account
router.delete('/:domain/accounts/:account', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain, account } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-delete-mail-account ${user} ${domain} ${account}`);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to delete mail account' });
    }

    res.json({ success: true, message: 'Mail account deleted successfully' });
  } catch (error) {
    console.error('Error deleting mail account:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mail/:domain/dkim - Get DKIM record
router.get('/:domain/dkim', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-list-mail-domain-dkim ${user} ${domain}`);

    res.json({ 
      success: true, 
      dkim: result.output || '' 
    });
  } catch (error) {
    console.error('Error getting DKIM:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/mail/:domain/dns-records - Get all DNS records needed for mail
router.get('/:domain/dns-records', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;
    
    const records = [];
    const hostname = await runHestiaCmd('hostname -f');
    const serverHostname = hostname.output?.trim() || 'mail.example.com';
    
    // Get server IP
    const ipResult = await runHestiaCmd('hostname -I');
    const serverIP = ipResult.output?.split(' ')[0] || '0.0.0.0';

    // MX Record
    records.push({
      type: 'MX',
      name: '@',
      value: `mail.${domain}`,
      priority: 10,
      ttl: 3600,
      description: 'Mail exchange record - directs email to your mail server'
    });

    // A Record for mail subdomain
    records.push({
      type: 'A',
      name: 'mail',
      value: serverIP,
      ttl: 3600,
      description: 'Points mail subdomain to your server IP'
    });

    // SPF Record
    records.push({
      type: 'TXT',
      name: '@',
      value: `v=spf1 a mx ip4:${serverIP} ~all`,
      ttl: 3600,
      description: 'Sender Policy Framework - authorizes your server to send emails'
    });

    // DKIM Records
    const dkimResult = await runHestiaCmd(`${HESTIA}/bin/v-list-mail-domain-dkim-dns ${user} ${domain}`);
    if (dkimResult.success && dkimResult.output) {
      const lines = dkimResult.output.split('\n').filter(l => l.trim() && !l.startsWith('RECORD') && !l.startsWith('------'));
      for (const line of lines) {
        const parts = line.split(/\s+/);
        if (parts.length >= 4) {
          const name = parts[0];
          const type = parts[3];
          // Find VALUE starting from after type
          const valueMatch = line.match(/"([^"]+)"/);
          if (valueMatch) {
            records.push({
              type: type,
              name: name,
              value: valueMatch[1],
              ttl: parseInt(parts[1]) || 3600,
              description: name.includes('_domainkey') ? 'DKIM signature record for email authentication' : 'DKIM policy record'
            });
          }
        }
      }
    }

    // DMARC Record
    records.push({
      type: 'TXT',
      name: '_dmarc',
      value: 'v=DMARC1; p=quarantine; rua=mailto:postmaster@' + domain,
      ttl: 3600,
      description: 'DMARC policy - tells receivers how to handle failed authentication'
    });

    res.json({ 
      success: true, 
      domain,
      serverIP,
      serverHostname,
      records 
    });
  } catch (error) {
    console.error('Error getting DNS records:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/mail/:domain/ssl - Enable SSL for mail domain
router.post('/:domain/ssl', async (req, res) => {
  try {
    const user = req.user.user;
    const { domain } = req.params;

    const result = await runHestiaCmd(`${HESTIA}/bin/v-add-mail-domain-ssl ${user} ${domain}`);

    if (!result.success) {
      return res.status(500).json({ error: 'Failed to enable SSL for mail domain' });
    }

    res.json({ success: true, message: 'SSL enabled successfully' });
  } catch (error) {
    console.error('Error enabling mail SSL:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
