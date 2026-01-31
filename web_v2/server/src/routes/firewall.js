import { Router } from 'express';
import { execHestia, execHestiaJson } from '../utils/hestia.js';
import { adminMiddleware } from '../middleware/auth.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const router = Router();

/**
 * Parse iptables output to structured format
 * @param {string} output - iptables -L -n -v output
 * @returns {Array} Parsed rules
 */
function parseIptablesOutput(output) {
  const rules = [];
  const lines = output.split('\n');
  let currentChain = '';

  for (const line of lines) {
    // Detect chain
    const chainMatch = line.match(/^Chain (\S+)/);
    if (chainMatch) {
      currentChain = chainMatch[1];
      continue;
    }

    // Skip headers and empty lines
    if (!line.trim() || line.includes('pkts') || line.includes('target')) {
      continue;
    }

    // Parse rule line with line numbers (format: num pkts bytes target prot opt in out source destination ...)
    const parts = line.trim().split(/\s+/);

    // Handle both formats: with and without line numbers
    let offset = 0;
    if (parts[0] && /^\d+$/.test(parts[0])) {
      offset = 1; // Skip line number
    }

    if (parts.length >= 9 + offset) {
      const pkts = parts[offset];
      const bytes = parts[offset + 1];
      const target = parts[offset + 2];
      const prot = parts[offset + 3];
      const opt = parts[offset + 4];
      const inIface = parts[offset + 5];
      const outIface = parts[offset + 6];
      const source = parts[offset + 7];
      const destination = parts[offset + 8];
      const rest = parts.slice(offset + 9);

      // Parse all rules (including fail2ban chains, not just ACCEPT/DROP/REJECT)
      // Extract port if exists
      let port = '';
      const dptMatch = rest.join(' ').match(/dpt[s]?:(\S+)/);
      if (dptMatch) {
        port = dptMatch[1];
      }

      rules.push({
        chain: currentChain,
        packets: pkts,
        bytes: bytes,
        action: target,
        protocol: prot === 'all' ? 'ALL' : prot.toUpperCase(),
        source: source,
        destination: destination,
        port: port,
        raw: line.trim()
      });
    }
  }

  return rules;
}

/**
 * GET /api/firewall
 * List all firewall rules from HestiaCP config
 */
router.get('/', adminMiddleware, async (req, res) => {
  try {
    const rules = await execHestiaJson('v-list-firewall', []);

    // Transform to array format
    const rulesArray = Object.entries(rules).map(([id, rule]) => ({
      id,
      action: rule.ACTION,
      protocol: rule.PROTOCOL,
      port: rule.PORT,
      ip: rule.IP,
      comment: rule.COMMENT || '',
      suspended: rule.SUSPENDED === 'yes',
      date: rule.DATE,
      time: rule.TIME
    }));

    res.json({ rules: rulesArray });
  } catch (error) {
    console.error('List firewall rules error:', error);
    res.status(500).json({ error: 'Failed to list firewall rules' });
  }
});

/**
 * GET /api/firewall/iptables
 * List actual iptables rules from the system
 */
router.get('/iptables', adminMiddleware, async (req, res) => {
  try {
    // Get iptables rules
    const { stdout } = await execAsync('iptables -L INPUT -n -v --line-numbers 2>/dev/null || echo "Firewall not available"');

    // Also try to get the policy
    const { stdout: policyOutput } = await execAsync('iptables -L INPUT -n 2>/dev/null | head -1 || echo ""');
    const policyMatch = policyOutput.match(/policy (\w+)/);
    const policy = policyMatch ? policyMatch[1] : 'UNKNOWN';

    const rules = parseIptablesOutput(stdout);

    res.json({
      policy,
      rules,
      raw: stdout
    });
  } catch (error) {
    console.error('Get iptables error:', error);
    res.status(500).json({ error: 'Failed to get iptables rules' });
  }
});

/**
 * GET /api/firewall/combined
 * Get both HestiaCP rules and actual iptables state for comparison
 */
router.get('/combined', adminMiddleware, async (req, res) => {
  try {
    // Get HestiaCP rules
    const hestiaRules = await execHestiaJson('v-list-firewall', []);

    // Get actual iptables
    let iptablesRules = [];
    let policy = 'UNKNOWN';
    try {
      const { stdout } = await execAsync('iptables -L INPUT -n -v --line-numbers 2>/dev/null');
      const { stdout: policyOutput } = await execAsync('iptables -L INPUT -n 2>/dev/null | head -1');
      const policyMatch = policyOutput.match(/policy (\w+)/);
      policy = policyMatch ? policyMatch[1] : 'UNKNOWN';
      iptablesRules = parseIptablesOutput(stdout);
    } catch (e) {
      // Firewall might not be available
    }

    // Transform HestiaCP rules
    const configuredRules = Object.entries(hestiaRules).map(([id, rule]) => ({
      id,
      action: rule.ACTION,
      protocol: rule.PROTOCOL,
      port: rule.PORT,
      ip: rule.IP,
      comment: rule.COMMENT || '',
      suspended: rule.SUSPENDED === 'yes',
      date: rule.DATE,
      time: rule.TIME,
      source: 'config'
    }));

    res.json({
      policy,
      configuredRules,
      activeRules: iptablesRules,
      firewallEnabled: policy !== 'UNKNOWN'
    });
  } catch (error) {
    console.error('Get combined firewall error:', error);
    res.status(500).json({ error: 'Failed to get firewall status' });
  }
});

/**
 * GET /api/firewall/:id
 * Get single firewall rule
 */
router.get('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const rule = await execHestiaJson('v-list-firewall-rule', [id]);

    if (!rule || !rule[id]) {
      return res.status(404).json({ error: 'Rule not found' });
    }

    res.json({
      id,
      action: rule[id].ACTION,
      protocol: rule[id].PROTOCOL,
      port: rule[id].PORT,
      ip: rule[id].IP,
      comment: rule[id].COMMENT || '',
      suspended: rule[id].SUSPENDED === 'yes',
      date: rule[id].DATE,
      time: rule[id].TIME
    });
  } catch (error) {
    console.error('Get firewall rule error:', error);
    res.status(500).json({ error: 'Failed to get firewall rule' });
  }
});

/**
 * POST /api/firewall
 * Add new firewall rule
 */
router.post('/', adminMiddleware, async (req, res) => {
  try {
    const { action, ip, port, protocol, comment } = req.body;

    // Validate required fields
    if (!action || !ip || !port || !protocol) {
      return res.status(400).json({ error: 'Missing required fields: action, ip, port, protocol' });
    }

    // Validate action
    if (!['ACCEPT', 'DROP'].includes(action.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid action. Must be ACCEPT or DROP' });
    }

    // Validate protocol
    if (!['TCP', 'UDP', 'ICMP'].includes(protocol.toUpperCase())) {
      return res.status(400).json({ error: 'Invalid protocol. Must be TCP, UDP, or ICMP' });
    }

    await execHestia('v-add-firewall-rule', [
      action.toUpperCase(),
      ip,
      port.toString(),
      protocol.toUpperCase(),
      comment || ''
    ]);

    res.json({ success: true, message: 'Firewall rule added successfully' });
  } catch (error) {
    console.error('Add firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to add firewall rule' });
  }
});

/**
 * PUT /api/firewall/:id
 * Update firewall rule
 */
router.put('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    const { action, ip, port, protocol, comment } = req.body;

    // Validate required fields
    if (!action || !ip || !port || !protocol) {
      return res.status(400).json({ error: 'Missing required fields: action, ip, port, protocol' });
    }

    await execHestia('v-change-firewall-rule', [
      id,
      action.toUpperCase(),
      ip,
      port.toString(),
      protocol.toUpperCase(),
      comment || ''
    ]);

    res.json({ success: true, message: 'Firewall rule updated successfully' });
  } catch (error) {
    console.error('Update firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to update firewall rule' });
  }
});

/**
 * DELETE /api/firewall/:id
 * Delete firewall rule
 */
router.delete('/:id', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await execHestia('v-delete-firewall-rule', [id]);

    res.json({ success: true, message: 'Firewall rule deleted successfully' });
  } catch (error) {
    console.error('Delete firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to delete firewall rule' });
  }
});

/**
 * POST /api/firewall/:id/suspend
 * Suspend firewall rule
 */
router.post('/:id/suspend', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await execHestia('v-suspend-firewall-rule', [id]);

    res.json({ success: true, message: 'Firewall rule suspended successfully' });
  } catch (error) {
    console.error('Suspend firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to suspend firewall rule' });
  }
});

/**
 * POST /api/firewall/:id/unsuspend
 * Unsuspend firewall rule
 */
router.post('/:id/unsuspend', adminMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    await execHestia('v-unsuspend-firewall-rule', [id]);

    res.json({ success: true, message: 'Firewall rule unsuspended successfully' });
  } catch (error) {
    console.error('Unsuspend firewall rule error:', error);
    res.status(500).json({ error: error.message || 'Failed to unsuspend firewall rule' });
  }
});

/**
 * POST /api/firewall/update
 * Apply firewall rules (v-update-firewall)
 */
router.post('/update', adminMiddleware, async (req, res) => {
  try {
    await execHestia('v-update-firewall', [], { timeout: 60000 });

    res.json({ success: true, message: 'Firewall rules applied successfully' });
  } catch (error) {
    console.error('Update firewall error:', error);
    res.status(500).json({ error: error.message || 'Failed to apply firewall rules' });
  }
});

/**
 * GET /api/firewall/ipset
 * List IPset lists
 */
router.get('/ipset/lists', adminMiddleware, async (req, res) => {
  try {
    const ipsets = await execHestiaJson('v-list-firewall-ipset', []);

    const ipsetArray = Object.entries(ipsets).map(([name, data]) => ({
      name,
      ipVersion: data.IP_VERSION,
      autoupdate: data.AUTOUPDATE,
      suspended: data.SUSPENDED === 'yes',
      date: data.DATE,
      time: data.TIME
    }));

    res.json({ ipsets: ipsetArray });
  } catch (error) {
    console.error('List IPset error:', error);
    res.status(500).json({ error: 'Failed to list IPset lists' });
  }
});

/**
 * GET /api/firewall/banlist
 * List banned IPs (fail2ban)
 */
router.get('/banlist', adminMiddleware, async (req, res) => {
  try {
    const bans = await execHestiaJson('v-list-firewall-ban', []);

    const banArray = Object.entries(bans).map(([ip, data]) => ({
      ip,
      chain: data.CHAIN,
      date: data.DATE,
      time: data.TIME
    }));

    res.json({ bans: banArray });
  } catch (error) {
    console.error('List banlist error:', error);
    res.status(500).json({ error: 'Failed to list banned IPs' });
  }
});

/**
 * POST /api/firewall/ban
 * Ban an IP
 */
router.post('/ban', adminMiddleware, async (req, res) => {
  try {
    const { ip, chain } = req.body;

    if (!ip || !chain) {
      return res.status(400).json({ error: 'Missing required fields: ip, chain' });
    }

    await execHestia('v-add-firewall-ban', [ip, chain]);

    res.json({ success: true, message: 'IP banned successfully' });
  } catch (error) {
    console.error('Ban IP error:', error);
    res.status(500).json({ error: error.message || 'Failed to ban IP' });
  }
});

/**
 * DELETE /api/firewall/ban/:ip/:chain
 * Unban an IP
 */
router.delete('/ban/:ip/:chain', adminMiddleware, async (req, res) => {
  try {
    const { ip, chain } = req.params;

    await execHestia('v-delete-firewall-ban', [ip, chain]);

    res.json({ success: true, message: 'IP unbanned successfully' });
  } catch (error) {
    console.error('Unban IP error:', error);
    res.status(500).json({ error: error.message || 'Failed to unban IP' });
  }
});

export default router;
