import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';

const router = Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';
const TEMPLATES_DIR = path.join(HESTIA_DIR, 'data/templates/web/nginx/php-fpm');

/**
 * GET /api/system/info
 * Get system configuration info (shells, php versions, packages, templates, IPs)
 */
router.get('/info', async (req, res) => {
  try {
    // Get available shells
    let shells = ['/bin/bash', '/bin/sh', '/usr/sbin/nologin'];
    try {
      const shellsData = fs.readFileSync('/etc/shells', 'utf8');
      shells = shellsData.split('\n')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('#'));
    } catch (e) {
      // Use defaults
    }

    // Get PHP versions
    let phpVersions = [];
    try {
      const phpDir = '/etc/php';
      if (fs.existsSync(phpDir)) {
        phpVersions = fs.readdirSync(phpDir)
          .filter(f => /^\d+\.\d+$/.test(f))
          .map(v => `php${v}`)
          .sort();
      }
    } catch (e) {
      // No PHP versions found
    }

    // Get packages
    let packages = ['default'];
    try {
      const packagesDir = path.join(HESTIA_DIR, 'data/packages');
      if (fs.existsSync(packagesDir)) {
        packages = fs.readdirSync(packagesDir)
          .filter(f => f.endsWith('.pkg'))
          .map(f => f.replace('.pkg', ''));
      }
    } catch (e) {
      // Use defaults
    }

    // Get IP addresses (public IPs from v-list-sys-ips)
    let ips = [];
    try {
      const ipsData = await execHestiaJson('v-list-sys-ips', []);
      // Get the public IP addresses (NAT or direct)
      ips = Object.entries(ipsData || {}).map(([ip, data]) => {
        // If NAT is set, use NAT IP as the public IP, otherwise use the IP itself
        return data.NAT || ip;
      }).filter((ip, index, self) => self.indexOf(ip) === index); // Remove duplicates
    } catch (e) {
      // Try to get from data folder
      try {
        const ipsDir = path.join(HESTIA_DIR, 'data/ips');
        if (fs.existsSync(ipsDir)) {
          ips = fs.readdirSync(ipsDir).filter(f => !f.startsWith('.'));
        }
      } catch (e2) {
        // No IPs found
      }
    }

    // Get web templates (nginx/php-fpm)
    let webTemplates = ['default'];
    try {
      // Templates are in nginx/php-fpm directory
      const templatesDir = path.join(HESTIA_DIR, 'data/templates/web/nginx/php-fpm');
      if (fs.existsSync(templatesDir)) {
        webTemplates = fs.readdirSync(templatesDir)
          .filter(f => f.endsWith('.tpl') && !f.endsWith('.stpl'))
          .map(f => f.replace('.tpl', ''))
          .filter(f => f !== 'suspended') // exclude suspended template
          .sort();
      }
    } catch (e) {
      // Use defaults
    }

    // Get backend templates (php-fpm)
    let backendTemplates = ['default'];
    try {
      const backendDir = path.join(HESTIA_DIR, 'data/templates/web/php-fpm');
      if (fs.existsSync(backendDir)) {
        backendTemplates = fs.readdirSync(backendDir)
          .filter(f => f.endsWith('.tpl'))
          .map(f => f.replace('.tpl', ''))
          .sort();
      }
    } catch (e) {
      // Use defaults
    }

    // Get web statistics options
    const webStats = ['none', 'awstats', 'webalizer'];

    // Check which services are installed
    const installedServices = {
      dns: fs.existsSync('/etc/bind') || fs.existsSync('/etc/named'),
      mail: fs.existsSync('/etc/exim4') || fs.existsSync('/etc/postfix'),
      db: fs.existsSync('/etc/mysql') || fs.existsSync('/etc/postgresql')
    };

    // Get DNS templates (BIND9)
    let dnsTemplates = ['default'];
    try {
      const dnsTemplatesDir = path.join(HESTIA_DIR, 'data/templates/dns');
      if (fs.existsSync(dnsTemplatesDir)) {
        dnsTemplates = fs.readdirSync(dnsTemplatesDir)
          .filter(f => f.endsWith('.tpl'))
          .map(f => f.replace('.tpl', ''))
          .sort();
      }
    } catch (e) {
      // Use defaults
    }

    // Get languages
    const languages = [
      { code: 'en', name: 'English' },
      { code: 'vi', name: 'Tiếng Việt' },
      { code: 'de', name: 'Deutsch' },
      { code: 'fr', name: 'Français' },
      { code: 'es', name: 'Español' },
      { code: 'ru', name: 'Русский' },
      { code: 'zh-cn', name: '中文 (简体)' },
      { code: 'ja', name: '日本語' },
      { code: 'pt-br', name: 'Português (BR)' },
      { code: 'nl', name: 'Nederlands' },
      { code: 'pl', name: 'Polski' },
      { code: 'it', name: 'Italiano' }
    ];

    res.json({
      shells,
      phpVersions,
      packages,
      languages,
      ips,
      webTemplates,
      backendTemplates,
      webStats,
      installedServices,
      dnsTemplates
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({ error: 'Failed to get system info' });
  }
});

/**
 * GET /api/system/templates/:name
 * Get template content (.tpl and .stpl files)
 */
router.get('/templates/:name', adminMiddleware, async (req, res) => {
  try {
    const { name } = req.params;
    const tplPath = path.join(TEMPLATES_DIR, `${name}.tpl`);
    const stplPath = path.join(TEMPLATES_DIR, `${name}.stpl`);

    let tpl = '';
    let stpl = '';

    if (fs.existsSync(tplPath)) {
      tpl = fs.readFileSync(tplPath, 'utf8');
    }
    if (fs.existsSync(stplPath)) {
      stpl = fs.readFileSync(stplPath, 'utf8');
    }

    if (!tpl && !stpl) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ name, tpl, stpl });
  } catch (error) {
    console.error('Get template error:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
});

/**
 * POST /api/system/templates
 * Create new template (.tpl and .stpl files)
 */
router.post('/templates', adminMiddleware, async (req, res) => {
  try {
    const { name, tpl, stpl } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Template name is required' });
    }

    // Validate template name (alphanumeric, dash, underscore only)
    if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
      return res.status(400).json({ error: 'Invalid template name. Use only letters, numbers, dashes, and underscores.' });
    }

    const tplPath = path.join(TEMPLATES_DIR, `${name}.tpl`);
    const stplPath = path.join(TEMPLATES_DIR, `${name}.stpl`);

    // Check if template already exists
    if (fs.existsSync(tplPath) || fs.existsSync(stplPath)) {
      return res.status(400).json({ error: 'Template already exists' });
    }

    // Write template files
    if (tpl) {
      fs.writeFileSync(tplPath, tpl, 'utf8');
    }
    if (stpl) {
      fs.writeFileSync(stplPath, stpl, 'utf8');
    }

    res.json({ success: true, name });
  } catch (error) {
    console.error('Create template error:', error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

export default router;
