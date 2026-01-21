import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/php/versions
 * List all installed PHP versions
 */
router.get('/versions', adminMiddleware, async (req, res) => {
  try {
    const { execSync } = await import('child_process');

    // Find all installed PHP-FPM versions
    const versions = [];
    try {
      const phpFpmServices = execSync(
        'systemctl list-unit-files --type=service | grep -oE "php[0-9.]+-fpm" | sed "s/-fpm//" | sed "s/php//" | sort -V',
        { encoding: 'utf8', timeout: 5000 }
      ).trim();

      if (phpFpmServices) {
        phpFpmServices.split('\n').forEach(version => {
          if (version && /^\d+\.\d+$/.test(version)) {
            versions.push(version);
          }
        });
      }
    } catch (e) {
      console.warn('Failed to list PHP versions:', e.message);
    }

    // Get default/active PHP version
    let defaultVersion = null;
    try {
      const phpVersion = execSync('php -v 2>/dev/null | head -1 | grep -oP "\\d+\\.\\d+" | head -1', { encoding: 'utf8', timeout: 5000 }).trim();
      if (phpVersion) {
        defaultVersion = phpVersion;
      }
    } catch (e) {
      // PHP CLI not installed or not in PATH
    }

    res.json({
      versions,
      defaultVersion,
      count: versions.length
    });
  } catch (error) {
    console.error('List PHP versions error:', error);
    res.status(500).json({ error: 'Failed to list PHP versions' });
  }
});

/**
 * GET /api/php/extensions/:version
 * List extensions for a specific PHP version
 */
router.get('/extensions/:version', adminMiddleware, async (req, res) => {
  try {
    const { version } = req.params;

    // Validate version format
    if (!/^\d+\.\d+$/.test(version)) {
      return res.status(400).json({ error: 'Invalid PHP version format. Use X.Y (e.g., 8.3)' });
    }

    // Call the shell script to get extensions
    const result = await execHestia('v-list-php-extensions', [version, 'json'], { timeout: 60000 });

    // Parse JSON output
    let data;
    try {
      data = JSON.parse(result.stdout || result);
    } catch (e) {
      console.error('Failed to parse extension list:', e);
      return res.status(500).json({ error: 'Failed to parse extension list' });
    }

    res.json(data);
  } catch (error) {
    console.error('List PHP extensions error:', error);
    res.status(500).json({ error: error.message || 'Failed to list PHP extensions' });
  }
});

/**
 * POST /api/php/extensions/:version/install
 * Install a PHP extension
 */
router.post('/extensions/:version/install', adminMiddleware, async (req, res) => {
  try {
    const { version } = req.params;
    const { extension } = req.body;

    // Validate version format
    if (!/^\d+\.\d+$/.test(version)) {
      return res.status(400).json({ error: 'Invalid PHP version format. Use X.Y (e.g., 8.3)' });
    }

    if (!extension) {
      return res.status(400).json({ error: 'Extension name is required' });
    }

    // Validate extension name (alphanumeric, hyphen, underscore)
    if (!/^[a-zA-Z0-9_-]+$/.test(extension)) {
      return res.status(400).json({ error: 'Invalid extension name' });
    }

    // Call the shell script to install extension
    await execHestia('v-add-php-extension', [extension, version], { timeout: 300000 }); // 5 min timeout

    res.json({
      success: true,
      message: `Extension ${extension} installed successfully for PHP ${version}`
    });
  } catch (error) {
    console.error('Install PHP extension error:', error);
    res.status(500).json({ error: error.message || 'Failed to install PHP extension' });
  }
});

/**
 * DELETE /api/php/extensions/:version/:extension
 * Remove a PHP extension
 */
router.delete('/extensions/:version/:extension', adminMiddleware, async (req, res) => {
  try {
    const { version, extension } = req.params;

    // Validate version format
    if (!/^\d+\.\d+$/.test(version)) {
      return res.status(400).json({ error: 'Invalid PHP version format. Use X.Y (e.g., 8.3)' });
    }

    // Validate extension name
    if (!/^[a-zA-Z0-9_-]+$/.test(extension)) {
      return res.status(400).json({ error: 'Invalid extension name' });
    }

    // Call the shell script to remove extension
    await execHestia('v-delete-php-extension', [extension, version], { timeout: 120000 }); // 2 min timeout

    res.json({
      success: true,
      message: `Extension ${extension} removed successfully for PHP ${version}`
    });
  } catch (error) {
    console.error('Remove PHP extension error:', error);
    res.status(500).json({ error: error.message || 'Failed to remove PHP extension' });
  }
});

export default router;
