import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import fs from 'fs';

const router = Router();
const HAPROXY_CONFIG = '/etc/haproxy/haproxy.cfg';

/**
 * Parse HAProxy config file into structured data
 */
function parseHAProxyConfig(configContent) {
  const sections = {
    global: {},
    defaults: {},
    frontends: {},
    backends: {},
    listens: {}
  };

  const lines = configContent.split('\n');
  let currentSection = null;
  let currentSectionName = null;
  let currentSectionData = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines and comments
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    // Check for section headers
    const sectionMatch = trimmedLine.match(/^(global|defaults|frontend|backend|listen)\s*(.*)$/);
    if (sectionMatch) {
      // Save previous section
      if (currentSection && currentSectionName) {
        if (currentSection === 'frontend') {
          sections.frontends[currentSectionName] = currentSectionData;
        } else if (currentSection === 'backend') {
          sections.backends[currentSectionName] = currentSectionData;
        } else if (currentSection === 'listen') {
          sections.listens[currentSectionName] = currentSectionData;
        }
      }

      currentSection = sectionMatch[1];
      currentSectionName = sectionMatch[2] || null;

      if (currentSection === 'global') {
        currentSectionData = sections.global;
      } else if (currentSection === 'defaults') {
        currentSectionData = sections.defaults;
      } else {
        currentSectionData = {
          bind: [],
          mode: null,
          balance: null,
          default_backend: null,
          servers: [],
          options: [],
          acls: [],
          use_backends: []
        };
      }
      continue;
    }

    // Parse section content
    if (currentSectionData) {
      // Parse bind
      if (trimmedLine.startsWith('bind ')) {
        currentSectionData.bind.push(trimmedLine.substring(5).trim());
      }
      // Parse mode
      else if (trimmedLine.startsWith('mode ')) {
        currentSectionData.mode = trimmedLine.substring(5).trim();
      }
      // Parse balance
      else if (trimmedLine.startsWith('balance ')) {
        currentSectionData.balance = trimmedLine.substring(8).trim();
      }
      // Parse default_backend
      else if (trimmedLine.startsWith('default_backend ')) {
        currentSectionData.default_backend = trimmedLine.substring(16).trim();
      }
      // Parse server
      else if (trimmedLine.startsWith('server ')) {
        const serverMatch = trimmedLine.match(/^server\s+(\S+)\s+(\S+)(.*)$/);
        if (serverMatch) {
          currentSectionData.servers.push({
            name: serverMatch[1],
            address: serverMatch[2],
            options: serverMatch[3]?.trim() || ''
          });
        }
      }
      // Parse ACL
      else if (trimmedLine.startsWith('acl ')) {
        currentSectionData.acls.push(trimmedLine.substring(4).trim());
      }
      // Parse use_backend
      else if (trimmedLine.startsWith('use_backend ')) {
        const useBackendMatch = trimmedLine.match(/^use_backend\s+(\S+)\s+if\s+(.+)$/);
        if (useBackendMatch) {
          currentSectionData.use_backends.push({
            backend: useBackendMatch[1],
            condition: useBackendMatch[2]
          });
        } else {
          currentSectionData.use_backends.push({
            backend: trimmedLine.substring(12).trim(),
            condition: ''
          });
        }
      }
      // Parse stats options
      else if (trimmedLine.startsWith('stats ')) {
        const statsPart = trimmedLine.substring(6).trim();
        if (statsPart.startsWith('uri ')) {
          currentSectionData.stats_uri = statsPart.substring(4).trim();
        } else if (statsPart.startsWith('auth ')) {
          currentSectionData.stats_auth = statsPart.substring(5).trim();
        } else if (statsPart === 'enable') {
          currentSectionData.stats_enabled = true;
        }
      }
      // Other options
      else if (currentSection !== 'global' && currentSection !== 'defaults') {
        currentSectionData.options.push(trimmedLine);
      }
    }
  }

  // Save last section
  if (currentSection && currentSectionName) {
    if (currentSection === 'frontend') {
      sections.frontends[currentSectionName] = currentSectionData;
    } else if (currentSection === 'backend') {
      sections.backends[currentSectionName] = currentSectionData;
    } else if (currentSection === 'listen') {
      sections.listens[currentSectionName] = currentSectionData;
    }
  }

  return sections;
}

/**
 * Check if user is admin
 */
function requireAdmin(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * GET /api/haproxy
 * Get HAProxy status and configuration
 */
router.get('/', requireAdmin, async (req, res) => {
  try {
    // Get HAProxy status from v-list-sys-haproxy
    let haproxyStatus = null;
    try {
      haproxyStatus = await execHestiaJson('v-list-sys-haproxy', []);
    } catch (e) {
      // HAProxy not installed or command failed
      return res.json({
        installed: false,
        status: null,
        config: null
      });
    }

    // Read and parse HAProxy config
    let config = null;
    try {
      if (fs.existsSync(HAPROXY_CONFIG)) {
        const configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');
        config = parseHAProxyConfig(configContent);
      }
    } catch (e) {
      console.error('Error reading HAProxy config:', e);
    }

    // Extract stats info from listens
    let statsInfo = null;
    if (config && config.listens && config.listens.stats) {
      statsInfo = config.listens.stats;
    }

    res.json({
      installed: true,
      status: haproxyStatus,
      config: config,
      statsInfo: statsInfo
    });
  } catch (error) {
    console.error('Get HAProxy status error:', error);
    res.status(500).json({ error: 'Failed to get HAProxy status' });
  }
});

/**
 * GET /api/haproxy/config/raw
 * Get raw HAProxy config file
 */
router.get('/config/raw', requireAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }
    const configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');
    res.json({ config: configContent });
  } catch (error) {
    console.error('Get HAProxy config error:', error);
    res.status(500).json({ error: 'Failed to read config file' });
  }
});

/**
 * POST /api/haproxy/restart
 * Restart HAProxy service
 */
router.post('/restart', requireAdmin, async (req, res) => {
  try {
    await execHestia('v-restart-service', ['haproxy']);
    res.json({ success: true, message: 'HAProxy restarted successfully' });
  } catch (error) {
    console.error('Restart HAProxy error:', error);
    res.status(500).json({ error: error.message || 'Failed to restart HAProxy' });
  }
});

/**
 * GET /api/haproxy/visualize
 * Get data for visualization
 */
router.get('/visualize', requireAdmin, async (req, res) => {
  try {
    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    const configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');
    const config = parseHAProxyConfig(configContent);

    // Build visualization data
    const nodes = [];
    const edges = [];

    // Build ACL name to condition mapping for each frontend
    const buildAclMap = (acls) => {
      const map = {};
      (acls || []).forEach(aclLine => {
        const parts = aclLine.match(/^(\S+)\s+(.+)$/);
        if (parts) {
          map[parts[1]] = parts[2];
        }
      });
      return map;
    };

    // Add frontend nodes
    Object.entries(config.frontends || {}).forEach(([name, data]) => {
      const aclMap = buildAclMap(data.acls);

      nodes.push({
        id: `frontend_${name}`,
        type: 'frontend',
        label: name,
        bind: data.bind,
        mode: data.mode,
        acls: data.acls || []
      });

      // Add edge to default backend
      if (data.default_backend) {
        edges.push({
          from: `frontend_${name}`,
          to: `backend_${data.default_backend}`,
          type: 'default',
          label: 'default'
        });
      }

      // Add edges for use_backend conditions
      (data.use_backends || []).forEach(ub => {
        // Build a more descriptive label showing ACL name and what it matches
        let label = ub.condition;
        // If condition is just an ACL name, try to show what it matches
        if (aclMap[ub.condition]) {
          const aclDef = aclMap[ub.condition];
          // Extract domain from hdr(host) -i domain.com
          const hostMatch = aclDef.match(/hdr\(host\)\s+-i\s+(.+)/i);
          if (hostMatch) {
            label = `${ub.condition}: ${hostMatch[1]}`;
          }
        }

        edges.push({
          from: `frontend_${name}`,
          to: `backend_${ub.backend}`,
          type: 'conditional',
          label: label,
          aclName: ub.condition
        });
      });
    });

    // Add backend nodes
    Object.entries(config.backends || {}).forEach(([name, data]) => {
      nodes.push({
        id: `backend_${name}`,
        type: 'backend',
        label: name,
        balance: data.balance,
        mode: data.mode,
        servers: data.servers
      });

      // Add server nodes and edges
      (data.servers || []).forEach((server, idx) => {
        const serverId = `server_${name}_${idx}`;
        nodes.push({
          id: serverId,
          type: 'server',
          label: server.name,
          address: server.address,
          options: server.options
        });
        edges.push({
          from: `backend_${name}`,
          to: serverId,
          type: 'server'
        });
      });
    });

    // Add listen nodes (combined frontend+backend)
    Object.entries(config.listens || {}).forEach(([name, data]) => {
      if (name === 'stats') return; // Skip stats section

      nodes.push({
        id: `listen_${name}`,
        type: 'listen',
        label: name,
        bind: data.bind,
        mode: data.mode,
        balance: data.balance
      });

      // Add server nodes and edges
      (data.servers || []).forEach((server, idx) => {
        const serverId = `server_${name}_${idx}`;
        nodes.push({
          id: serverId,
          type: 'server',
          label: server.name,
          address: server.address,
          options: server.options
        });
        edges.push({
          from: `listen_${name}`,
          to: serverId,
          type: 'server'
        });
      });
    });

    res.json({ nodes, edges });
  } catch (error) {
    console.error('Get HAProxy visualization error:', error);
    res.status(500).json({ error: 'Failed to get visualization data' });
  }
});

/**
 * PUT /api/haproxy/config/raw
 * Save raw HAProxy config file
 */
router.put('/config/raw', requireAdmin, async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Config content is required' });
    }

    // Backup current config
    const backupPath = `${HAPROXY_CONFIG}.backup.${Date.now()}`;
    if (fs.existsSync(HAPROXY_CONFIG)) {
      fs.copyFileSync(HAPROXY_CONFIG, backupPath);
    }

    // Write new config
    fs.writeFileSync(HAPROXY_CONFIG, config, 'utf8');

    // Validate config using haproxy -c
    try {
      const { execSync } = await import('child_process');
      execSync(`haproxy -c -f ${HAPROXY_CONFIG}`, { encoding: 'utf8' });
    } catch (validateErr) {
      // Restore backup if validation fails
      if (fs.existsSync(backupPath)) {
        fs.copyFileSync(backupPath, HAPROXY_CONFIG);
      }
      return res.status(400).json({
        error: 'Invalid configuration',
        details: validateErr.message
      });
    }

    // Restart HAProxy
    let restarted = false;
    try {
      await execHestia('v-restart-service', ['haproxy']);
      restarted = true;
    } catch (restartErr) {
      console.error('Failed to restart HAProxy:', restartErr);
    }

    res.json({ success: true, restarted });
  } catch (error) {
    console.error('Save HAProxy config error:', error);
    res.status(500).json({ error: 'Failed to save config file' });
  }
});

/**
 * POST /api/haproxy/config/validate
 * Validate HAProxy config
 */
router.post('/config/validate', requireAdmin, async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) {
      return res.status(400).json({ error: 'Config content is required' });
    }

    // Write to temp file
    const tempPath = '/tmp/haproxy_validate.cfg';
    fs.writeFileSync(tempPath, config, 'utf8');

    // Validate using haproxy -c
    try {
      const { execSync } = await import('child_process');
      const result = execSync(`haproxy -c -f ${tempPath} 2>&1`, { encoding: 'utf8' });
      fs.unlinkSync(tempPath);
      res.json({ valid: true, output: result || 'Configuration is valid' });
    } catch (validateErr) {
      fs.unlinkSync(tempPath);
      res.json({ valid: false, output: validateErr.stdout || validateErr.message });
    }
  } catch (error) {
    console.error('Validate HAProxy config error:', error);
    res.status(500).json({ error: 'Failed to validate config' });
  }
});

/**
 * Generate frontend config block
 */
function generateFrontendConfig(data) {
  let config = `\nfrontend ${data.name}\n`;

  // Bind addresses
  for (const bind of data.bind || []) {
    config += `    bind ${bind}\n`;
  }

  // Mode
  if (data.mode) {
    config += `    mode ${data.mode}\n`;
  }

  // ACLs
  for (const acl of data.acls || []) {
    config += `    acl ${acl.name} ${acl.condition}\n`;
  }

  // Use backends (routing rules)
  for (const ub of data.use_backends || []) {
    if (ub.condition) {
      config += `    use_backend ${ub.backend} if ${ub.condition}\n`;
    } else {
      config += `    use_backend ${ub.backend}\n`;
    }
  }

  // Additional options
  for (const opt of data.options || []) {
    config += `    ${opt}\n`;
  }

  // Default backend
  if (data.default_backend) {
    config += `    default_backend ${data.default_backend}\n`;
  }

  return config;
}

/**
 * Generate backend config block
 */
function generateBackendConfig(data) {
  let config = `\nbackend ${data.name}\n`;

  // Mode
  if (data.mode) {
    config += `    mode ${data.mode}\n`;
  }

  // Balance
  if (data.balance) {
    config += `    balance ${data.balance}\n`;
  }

  // Health check
  if (data.health_check) {
    config += `    option httpchk GET /\n`;
    config += `    http-check expect status 200-499\n`;
  }

  // Additional options
  for (const opt of data.options || []) {
    config += `    ${opt}\n`;
  }

  // Servers
  for (const server of data.servers || []) {
    let serverLine = `    server ${server.name} ${server.address}`;
    if (data.health_check) {
      serverLine += ' check inter 5s fall 3 rise 2';
    }
    if (server.options) {
      serverLine += ` ${server.options}`;
    }
    config += serverLine + '\n';
  }

  return config;
}

/**
 * POST /api/haproxy/frontend
 * Add a new frontend
 */
router.post('/frontend', requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.bind || data.bind.length === 0) {
      return res.status(400).json({ error: 'Name and bind addresses are required' });
    }

    // Read current config
    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }
    let configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');

    // Check if frontend already exists
    if (configContent.includes(`frontend ${data.name}`)) {
      return res.status(400).json({ error: 'Frontend with this name already exists' });
    }

    // Generate and append frontend config
    const frontendConfig = generateFrontendConfig(data);
    configContent += frontendConfig;

    // Backup and write
    const backupPath = `${HAPROXY_CONFIG}.backup.${Date.now()}`;
    fs.copyFileSync(HAPROXY_CONFIG, backupPath);
    fs.writeFileSync(HAPROXY_CONFIG, configContent, 'utf8');

    // Validate
    try {
      const { execSync } = await import('child_process');
      execSync(`haproxy -c -f ${HAPROXY_CONFIG}`, { encoding: 'utf8' });
    } catch (validateErr) {
      fs.copyFileSync(backupPath, HAPROXY_CONFIG);
      return res.status(400).json({ error: 'Invalid configuration', details: validateErr.message });
    }

    // Restart HAProxy
    await execHestia('v-restart-service', ['haproxy']);

    res.json({ success: true, message: 'Frontend added successfully' });
  } catch (error) {
    console.error('Add frontend error:', error);
    res.status(500).json({ error: 'Failed to add frontend' });
  }
});

/**
 * POST /api/haproxy/backend
 * Add a new backend
 */
router.post('/backend', requireAdmin, async (req, res) => {
  try {
    const data = req.body;

    if (!data.name || !data.servers || data.servers.length === 0) {
      return res.status(400).json({ error: 'Name and servers are required' });
    }

    // Read current config
    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }
    let configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');

    // Check if backend already exists
    if (configContent.includes(`backend ${data.name}`)) {
      return res.status(400).json({ error: 'Backend with this name already exists' });
    }

    // Generate and append backend config
    const backendConfig = generateBackendConfig(data);
    configContent += backendConfig;

    // Backup and write
    const backupPath = `${HAPROXY_CONFIG}.backup.${Date.now()}`;
    fs.copyFileSync(HAPROXY_CONFIG, backupPath);
    fs.writeFileSync(HAPROXY_CONFIG, configContent, 'utf8');

    // Validate
    try {
      const { execSync } = await import('child_process');
      execSync(`haproxy -c -f ${HAPROXY_CONFIG}`, { encoding: 'utf8' });
    } catch (validateErr) {
      fs.copyFileSync(backupPath, HAPROXY_CONFIG);
      return res.status(400).json({ error: 'Invalid configuration', details: validateErr.message });
    }

    // Restart HAProxy
    await execHestia('v-restart-service', ['haproxy']);

    res.json({ success: true, message: 'Backend added successfully' });
  } catch (error) {
    console.error('Add backend error:', error);
    res.status(500).json({ error: 'Failed to add backend' });
  }
});

/**
 * DELETE /api/haproxy/frontend/:name
 * Delete a frontend
 */
router.delete('/frontend/:name', requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;

    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    let configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');

    // Remove frontend section using regex
    const frontendRegex = new RegExp(`\\nfrontend ${name}\\n([^]*?)(?=\\n(?:frontend|backend|listen)|$)`, 'g');
    const newConfig = configContent.replace(frontendRegex, '');

    if (newConfig === configContent) {
      return res.status(404).json({ error: 'Frontend not found' });
    }

    // Backup and write
    const backupPath = `${HAPROXY_CONFIG}.backup.${Date.now()}`;
    fs.copyFileSync(HAPROXY_CONFIG, backupPath);
    fs.writeFileSync(HAPROXY_CONFIG, newConfig, 'utf8');

    // Validate
    try {
      const { execSync } = await import('child_process');
      execSync(`haproxy -c -f ${HAPROXY_CONFIG}`, { encoding: 'utf8' });
    } catch (validateErr) {
      fs.copyFileSync(backupPath, HAPROXY_CONFIG);
      return res.status(400).json({ error: 'Invalid configuration after deletion' });
    }

    // Restart HAProxy
    await execHestia('v-restart-service', ['haproxy']);

    res.json({ success: true, message: 'Frontend deleted successfully' });
  } catch (error) {
    console.error('Delete frontend error:', error);
    res.status(500).json({ error: 'Failed to delete frontend' });
  }
});

/**
 * DELETE /api/haproxy/backend/:name
 * Delete a backend
 */
router.delete('/backend/:name', requireAdmin, async (req, res) => {
  try {
    const { name } = req.params;

    if (!fs.existsSync(HAPROXY_CONFIG)) {
      return res.status(404).json({ error: 'Config file not found' });
    }

    let configContent = fs.readFileSync(HAPROXY_CONFIG, 'utf8');

    // Remove backend section using regex
    const backendRegex = new RegExp(`\\nbackend ${name}\\n([^]*?)(?=\\n(?:frontend|backend|listen)|$)`, 'g');
    const newConfig = configContent.replace(backendRegex, '');

    if (newConfig === configContent) {
      return res.status(404).json({ error: 'Backend not found' });
    }

    // Backup and write
    const backupPath = `${HAPROXY_CONFIG}.backup.${Date.now()}`;
    fs.copyFileSync(HAPROXY_CONFIG, backupPath);
    fs.writeFileSync(HAPROXY_CONFIG, newConfig, 'utf8');

    // Validate
    try {
      const { execSync } = await import('child_process');
      execSync(`haproxy -c -f ${HAPROXY_CONFIG}`, { encoding: 'utf8' });
    } catch (validateErr) {
      fs.copyFileSync(backupPath, HAPROXY_CONFIG);
      return res.status(400).json({ error: 'Invalid configuration after deletion' });
    }

    // Restart HAProxy
    await execHestia('v-restart-service', ['haproxy']);

    res.json({ success: true, message: 'Backend deleted successfully' });
  } catch (error) {
    console.error('Delete backend error:', error);
    res.status(500).json({ error: 'Failed to delete backend' });
  }
});

/**
 * GET /api/haproxy/user-backends
 * Get user backends from web.conf (domains with HAPROXY_BACKEND='yes')
 */
router.get('/user-backends', requireAdmin, async (req, res) => {
  try {
    // Get all users
    const usersResult = await execHestiaJson('v-list-users', ['json']);
    const users = Object.keys(usersResult || {});

    const userBackends = [];

    for (const user of users) {
      try {
        // Get user's web domains
        const domainsResult = await execHestiaJson('v-list-web-domains', [user, 'json']);

        for (const [domain, data] of Object.entries(domainsResult || {})) {
          if (data.HAPROXY_BACKEND === 'yes') {
            userBackends.push({
              user,
              domain,
              host: data.HAPROXY_HOST || '127.0.0.1',
              port: data.HAPROXY_PORT || '',
              type: data.HAPROXY_TYPE || 'nginx',
              ssl: data.HAPROXY_SSL || 'termination'
            });
          }
        }
      } catch (e) {
        // Skip user if error
        continue;
      }
    }

    res.json(userBackends);
  } catch (error) {
    console.error('Get user backends error:', error);
    res.status(500).json({ error: 'Failed to get user backends' });
  }
});

// ============================================================
// USER HAPROXY DOMAIN MANAGEMENT (accessible by regular users)
// ============================================================

/**
 * GET /api/haproxy/domains
 * List current user's HAProxy domains
 */
router.get('/domains', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const result = await execHestiaJson('v-list-user-haproxy-domains', [username]);

    // Convert legacy format (backend.host/port) to new format (servers array)
    if (result && result.domains) {
      result.domains = result.domains.map(d => {
        // If already has servers array, use it
        if (d.servers && Array.isArray(d.servers) && d.servers.length > 0) {
          return d;
        }
        // Convert from legacy backend.host/port to servers array
        if (d.backend && (d.backend.host || d.backend.port)) {
          const address = `${d.backend.host || '127.0.0.1'}:${d.backend.port || '3000'}`;
          return {
            ...d,
            servers: [{
              name: 'server1',
              address: address,
              type: 'ip',
              options: ''
            }],
            balance: d.balance || 'roundrobin',
            mode: d.mode || 'http'
          };
        }
        return d;
      });
    }

    res.json(result);
  } catch (error) {
    console.error('List user HAProxy domains error:', error);
    // Return empty domains if no config exists
    res.json({ domains: [] });
  }
});

/**
 * GET /api/haproxy/available-domains
 * Get user's web domains that are not yet in HAProxy
 */
router.get('/available-domains', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    // Get user's web domains
    const webDomains = await execHestiaJson('v-list-web-domains', [username]);

    // Get user's HAProxy domains
    let haproxyDomains = [];
    try {
      const haproxyData = await execHestiaJson('v-list-user-haproxy-domains', [username]);
      haproxyDomains = (haproxyData.domains || []).map(d => d.domain);
    } catch (e) {
      // No HAProxy config yet
    }

    // Filter out domains already in HAProxy
    const availableDomains = Object.keys(webDomains || {})
      .filter(domain => !haproxyDomains.includes(domain))
      .map(domain => ({
        domain,
        ssl: webDomains[domain].SSL === 'yes',
        ip: webDomains[domain].IP
      }));

    res.json({ domains: availableDomains });
  } catch (error) {
    console.error('Get available domains error:', error);
    res.status(500).json({ error: 'Failed to get available domains' });
  }
});

/**
 * POST /api/haproxy/domains
 * Add a domain to user's HAProxy config
 *
 * New format (Frontend/Backend separation):
 * {
 *   domain: string,
 *   aliases: string[],
 *   routingMode: 'simple' | 'advanced',
 *   defaultBackend: string (backend name),
 *   aclRules: [{ name, condition, pattern, backend }],
 *   backends: [{ name, mode, balance, options, servers[] }],
 *   ssl: { mode: 'termination' | 'passthrough' | 'none' },
 *   enabled: boolean
 * }
 */
router.post('/domains', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const {
      domain,
      aliases = [],
      routingMode = 'simple',
      defaultBackend = '',
      aclRules = [],
      backends = [],
      ssl = { mode: 'termination' },
      enabled = true,
      // Legacy format support
      servers,
      balance,
      mode,
      backendHost,
      backendPort,
      backendType = 'pm2',
      sslMode,
      healthCheck,
      stickySession,
      forwardHeaders,
      timeout,
      customConfig,
      pathRules
    } = req.body;

    if (!domain) {
      return res.status(400).json({ error: 'Domain is required' });
    }

    // Check if this is new format (has backends array or uses __system__) or legacy format
    const isNewFormat = Array.isArray(backends) || defaultBackend === '__system__';

    if (isNewFormat) {
      // ============ NEW FORMAT ============
      const backendList = backends || [];

      // Validate each backend
      for (const backend of backendList) {
        if (!backend.name) {
          return res.status(400).json({ error: 'Each backend must have a name' });
        }
        if (!backend.servers || backend.servers.length === 0) {
          return res.status(400).json({ error: `Backend "${backend.name}" must have at least one server` });
        }
      }

      // If no backends, must use __system__ as default
      if (backendList.length === 0 && defaultBackend !== '__system__') {
        return res.status(400).json({ error: 'At least one backend is required (or use System Web Server as default)' });
      }

      // Validate defaultBackend exists in backends (skip __system__ which routes to web_backend)
      if (defaultBackend && defaultBackend !== '__system__' && !backendList.find(b => b.name === defaultBackend)) {
        return res.status(400).json({ error: `Default backend "${defaultBackend}" not found in backends list` });
      }

      // Validate aclRules reference valid backends (skip __system__)
      for (const rule of aclRules) {
        if (rule.backend !== '__system__' && !backendList.find(b => b.name === rule.backend)) {
          return res.status(400).json({ error: `ACL rule "${rule.name}" references unknown backend "${rule.backend}"` });
        }
      }

      // Build the full domain config JSON for shell script
      const domainConfig = JSON.stringify({
        domain,
        aliases: typeof aliases === 'string' ? aliases.split(/[\s,]+/).filter(Boolean) : aliases,
        routingMode,
        defaultBackend: defaultBackend || (backendList.length > 0 ? backendList[0].name : '__system__'),
        aclRules,
        backends: backendList,
        ssl,
        enabled
      });

      // Call the add script with new format
      await execHestia('v-add-user-haproxy-domain', [
        username,
        domain,
        domainConfig,
        'json'  // Flag to indicate JSON format
      ]);

    } else {
      // ============ LEGACY FORMAT ============
      // Build servers JSON for the script
      let serversJson;
      if (servers && servers.length > 0) {
        serversJson = JSON.stringify(servers);
      } else if (backendPort) {
        const port = parseInt(backendPort);
        if (isNaN(port) || port < 1 || port > 65535) {
          return res.status(400).json({ error: 'Invalid port number' });
        }
        serversJson = JSON.stringify([{
          name: 'server1',
          address: `${backendHost || '127.0.0.1'}:${port}`,
          type: 'ip',
          options: ''
        }]);
      } else {
        return res.status(400).json({ error: 'At least one backend server is required' });
      }

      // Build options JSON
      const optionsJson = JSON.stringify({
        healthCheck: healthCheck !== false,
        stickySession: stickySession || false,
        forwardHeaders: forwardHeaders !== false,
        customConfig: customConfig || '',
        pathRules: pathRules || [],
        defaultBackend: defaultBackend || 'custom'
      });

      // Build timeout JSON
      const timeoutJson = JSON.stringify(timeout || { connect: '10s', server: '30s', client: '30s' });

      // Aliases string
      const aliasesStr = typeof aliases === 'string' ? aliases : (aliases || []).join(' ');

      // Call the add script with legacy format
      await execHestia('v-add-user-haproxy-domain', [
        username,
        domain,
        serversJson,
        balance || 'roundrobin',
        mode || 'http',
        backendType,
        sslMode || ssl?.mode || 'termination',
        aliasesStr,
        optionsJson,
        timeoutJson
      ]);
    }

    res.json({ success: true, message: `Domain ${domain} added to HAProxy` });
  } catch (error) {
    console.error('Add HAProxy domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to add domain' });
  }
});

/**
 * PUT /api/haproxy/domains/:domain
 * Update a domain in user's HAProxy config
 *
 * New format (Frontend/Backend separation):
 * {
 *   domain: string,
 *   aliases: string[],
 *   routingMode: 'simple' | 'advanced',
 *   defaultBackend: string (backend name),
 *   aclRules: [{ name, condition, pattern, backend }],
 *   backends: [{ name, mode, balance, options, servers[] }],
 *   ssl: { mode: 'termination' | 'passthrough' | 'none' },
 *   enabled: boolean
 * }
 */
router.put('/domains/:domain', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { domain } = req.params;
    const {
      aliases = [],
      routingMode = 'simple',
      defaultBackend = '',
      aclRules = [],
      backends = [],
      ssl = { mode: 'termination' },
      enabled = true,
      // Legacy format support
      servers,
      balance,
      mode,
      backendHost,
      backendPort,
      backendType = 'pm2',
      sslMode,
      healthCheck,
      stickySession,
      forwardHeaders,
      timeout,
      customConfig,
      pathRules
    } = req.body;

    // Check if this is new format (has backends array or uses __system__) or legacy format
    const isNewFormat = Array.isArray(backends) || defaultBackend === '__system__';

    if (isNewFormat) {
      // ============ NEW FORMAT ============
      const backendList = backends || [];

      // Validate each backend
      for (const backend of backendList) {
        if (!backend.name) {
          return res.status(400).json({ error: 'Each backend must have a name' });
        }
        if (!backend.servers || backend.servers.length === 0) {
          return res.status(400).json({ error: `Backend "${backend.name}" must have at least one server` });
        }
      }

      // If no backends, must use __system__ as default
      if (backendList.length === 0 && defaultBackend !== '__system__') {
        return res.status(400).json({ error: 'At least one backend is required (or use System Web Server as default)' });
      }

      // Validate defaultBackend exists in backends (skip __system__ which routes to web_backend)
      if (defaultBackend && defaultBackend !== '__system__' && !backendList.find(b => b.name === defaultBackend)) {
        return res.status(400).json({ error: `Default backend "${defaultBackend}" not found in backends list` });
      }

      // Validate aclRules reference valid backends (skip __system__)
      for (const rule of aclRules) {
        if (rule.backend !== '__system__' && !backendList.find(b => b.name === rule.backend)) {
          return res.status(400).json({ error: `ACL rule "${rule.name}" references unknown backend "${rule.backend}"` });
        }
      }

      // Build the full domain config JSON for shell script
      const domainConfig = JSON.stringify({
        domain,
        aliases: typeof aliases === 'string' ? aliases.split(/[\s,]+/).filter(Boolean) : aliases,
        routingMode,
        defaultBackend: defaultBackend || (backendList.length > 0 ? backendList[0].name : '__system__'),
        aclRules,
        backends: backendList,
        ssl,
        enabled
      });

      // Call the change script with new format
      await execHestia('v-change-user-haproxy-domain', [
        username,
        domain,
        domainConfig,
        'json'  // Flag to indicate JSON format
      ]);

    } else {
      // ============ LEGACY FORMAT ============
      // Build servers JSON for the script
      let serversJson;
      if (servers && servers.length > 0) {
        serversJson = JSON.stringify(servers);
      } else if (backendPort) {
        const port = parseInt(backendPort);
        if (isNaN(port) || port < 1 || port > 65535) {
          return res.status(400).json({ error: 'Invalid port number' });
        }
        serversJson = JSON.stringify([{
          name: 'server1',
          address: `${backendHost || '127.0.0.1'}:${port}`,
          type: 'ip',
          options: ''
        }]);
      } else {
        return res.status(400).json({ error: 'At least one backend server is required' });
      }

      // Build options JSON
      const optionsJson = JSON.stringify({
        healthCheck: healthCheck !== false,
        stickySession: stickySession || false,
        forwardHeaders: forwardHeaders !== false,
        customConfig: customConfig || '',
        pathRules: pathRules || [],
        defaultBackend: defaultBackend || 'custom'
      });

      // Build timeout JSON
      const timeoutJson = JSON.stringify(timeout || { connect: '10s', server: '30s', client: '30s' });

      // Aliases string
      const aliasesStr = typeof aliases === 'string' ? aliases : (aliases || []).join(' ');

      // Call the change script with legacy format
      await execHestia('v-change-user-haproxy-domain', [
        username,
        domain,
        serversJson,
        balance || 'roundrobin',
        mode || 'http',
        backendType,
        sslMode || ssl?.mode || 'termination',
        aliasesStr,
        optionsJson,
        timeoutJson,
        enabled ? 'yes' : 'no'
      ]);
    }

    res.json({ success: true, message: `Domain ${domain} updated` });
  } catch (error) {
    console.error('Update HAProxy domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to update domain' });
  }
});

/**
 * DELETE /api/haproxy/domains/:domain
 * Remove a domain from user's HAProxy config
 */
router.delete('/domains/:domain', async (req, res) => {
  try {
    const username = req.user?.user;
    if (!username) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const { domain } = req.params;

    await execHestia('v-delete-user-haproxy-domain', [username, domain]);

    res.json({ success: true, message: `Domain ${domain} removed from HAProxy` });
  } catch (error) {
    console.error('Delete HAProxy domain error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete domain' });
  }
});

export default router;
