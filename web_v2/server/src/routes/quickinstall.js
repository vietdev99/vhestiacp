import { Router } from 'express';
import { execSync } from 'child_process';

const router = Router();
const HESTIA_CMD = '/usr/local/vhestia/bin/v-quick-install-app';

/**
 * GET /api/quickinstall/apps
 * List available apps for quick installation
 */
router.get('/apps', async (req, res) => {
  try {
    const output = execSync(`${HESTIA_CMD} app`, { encoding: 'utf8' });

    // Parse the output to extract app names and versions
    const lines = output.split('\n');
    const apps = [];

    for (const line of lines) {
      const match = line.match(/^(\w+)\s+-\s+(.+)$/);
      if (match) {
        apps.push({
          name: match[1],
          version: match[2].trim()
        });
      }
    }

    res.json({ apps });
  } catch (error) {
    console.error('List apps error:', error);
    res.status(500).json({ error: 'Failed to list available apps' });
  }
});

/**
 * GET /api/quickinstall/options/:app
 * Get installation options for a specific app
 */
router.get('/options/:app', async (req, res) => {
  try {
    const { app } = req.params;
    const { domain } = req.query;
    const username = req.user.user;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    const output = execSync(
      `${HESTIA_CMD} options ${username} ${domain} ${app}`,
      { encoding: 'utf8' }
    );

    // Parse options from output
    const options = [];
    const lines = output.split('\n');

    for (const line of lines) {
      // Parse lines like: Key: site_name Default Value: WordPress Blog Type: text
      // or: Key: email Type: text (Required)
      const keyMatch = line.match(/^Key:?\s+(\w+)/);
      if (keyMatch) {
        const key = keyMatch[1];
        const option = { key };

        // Extract default value
        const defaultMatch = line.match(/Default Value:\s+([^\s]+(?:\s+\w+)*?)(?:\s+Type:|$)/);
        if (defaultMatch) {
          option.defaultValue = defaultMatch[1].trim();
        }

        // Extract type
        const typeMatch = line.match(/Type:\s+(\w+)/);
        if (typeMatch) {
          option.type = typeMatch[1];
        }

        // Check if required
        option.required = line.includes('(Required)');

        options.push(option);
      }
    }

    res.json({ app, options });
  } catch (error) {
    console.error('Get app options error:', error);
    res.status(500).json({ error: error.message || 'Failed to get app options' });
  }
});

/**
 * POST /api/quickinstall/install
 * Install an app on a domain
 */
router.post('/install', async (req, res) => {
  try {
    const { domain, app, options = {} } = req.body;
    const username = req.user.user;

    if (!domain || !app) {
      return res.status(400).json({ error: 'Domain and app are required' });
    }

    // Build options string
    const optionsArgs = Object.entries(options)
      .filter(([_, value]) => value !== undefined && value !== '')
      .map(([key, value]) => `${key}="${value}"`)
      .join(' ');

    const cmd = `${HESTIA_CMD} install ${username} ${domain} ${app} ${optionsArgs}`;

    console.log('Quick install command:', cmd);

    const output = execSync(cmd, { encoding: 'utf8', timeout: 300000 }); // 5 min timeout

    res.json({
      success: true,
      message: `${app} installed successfully`,
      output
    });
  } catch (error) {
    console.error('Install app error:', error);
    res.status(500).json({ error: error.message || 'Failed to install app' });
  }
});

export default router;
