import { Router } from 'express';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { generateToken, verifyToken, authMiddleware } from '../middleware/auth.js';
import { execHestiaJson } from '../utils/hestia.js';
import { authenticator } from 'otplib';
import QRCode from 'qrcode';

const router = Router();
const HESTIA_DIR = process.env.HESTIA || '/usr/local/vhestia';
const TWO_FA_DIR = path.join(HESTIA_DIR, 'data/2fa');

// Ensure 2FA directory exists
if (!fs.existsSync(TWO_FA_DIR)) {
  try { fs.mkdirSync(TWO_FA_DIR, { recursive: true, mode: 0o700 }); } catch (e) {}
}

// Helper to get 2FA config path for user
const get2FAPath = (username) => path.join(TWO_FA_DIR, `${username}.json`);

// Helper to load 2FA config
const load2FA = (username) => {
  const filePath = get2FAPath(username);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) { return null; }
  }
  return null;
};

// Helper to save 2FA config
const save2FA = (username, config) => {
  const filePath = get2FAPath(username);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), { mode: 0o600 });
};

// Helper to delete 2FA config
const delete2FA = (username) => {
  const filePath = get2FAPath(username);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

/**
 * POST /api/auth/login
 * Login with username and password (same as v1)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password, totpCode } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Validate credentials using Hestia's v-check-user-password
    try {
      execSync(`/usr/local/vhestia/bin/v-check-user-password '${username}' '${password}'`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      console.error('Password check failed:', err.stderr?.toString() || err.message);
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // Get user info
    const users = await execHestiaJson('v-list-user', [username]);
    const userData = users[username];

    if (!userData) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Check if user is suspended
    if (userData.SUSPENDED === 'yes') {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    // Check 2FA
    const twoFAConfig = load2FA(username);
    if (twoFAConfig?.enabled) {
      if (!totpCode) {
        return res.status(200).json({ 
          requiresTwoFactor: true,
          message: 'Two-factor authentication code required'
        });
      }
      
      const isValid = authenticator.verify({ token: totpCode, secret: twoFAConfig.secret });
      if (!isValid) {
        // Check backup codes
        const backupIndex = twoFAConfig.backupCodes?.indexOf(totpCode);
        if (backupIndex === -1) {
          return res.status(401).json({ error: 'Invalid two-factor authentication code' });
        }
        // Remove used backup code
        twoFAConfig.backupCodes.splice(backupIndex, 1);
        save2FA(username, twoFAConfig);
      }
    }

    // Generate token
    const token = generateToken({
      USER: username,
      ROLE: userData.ROLE || (username === 'admin' ? 'admin' : 'user'),
      NAME: userData.NAME
    });

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    });

    res.json({
      success: true,
      user: {
        username,
        name: userData.NAME,
        email: userData.CONTACT,
        role: userData.ROLE || (username === 'admin' ? 'admin' : 'user'),
        twoFactorEnabled: !!twoFAConfig?.enabled
      },
      token
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

/**
 * POST /api/auth/login-as/:username
 * Login as another user (admin only)
 */
router.post('/login-as/:username', async (req, res) => {
  try {
    // Get current token
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = verifyToken(token);
    if (!decoded || decoded.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const { username } = req.params;

    // Get target user info
    const users = await execHestiaJson('v-list-user', [username]);
    const userData = users[username];

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Store admin username in token for return functionality
    const newToken = generateToken({
      USER: username,
      ROLE: userData.ROLE || 'user',
      NAME: userData.NAME,
      ADMIN_USER: decoded.user // Store original admin
    });

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        username,
        name: userData.NAME,
        email: userData.CONTACT,
        role: userData.ROLE || 'user'
      }
    });
  } catch (error) {
    console.error('Login as user error:', error);
    res.status(500).json({ error: 'Failed to login as user' });
  }
});

/**
 * POST /api/auth/return-to-admin
 * Return to admin account after login-as
 */
router.post('/return-to-admin', async (req, res) => {
  try {
    const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const decoded = verifyToken(token);
    if (!decoded || !decoded.adminUser) {
      return res.status(400).json({ error: 'No previous admin session' });
    }

    const adminUsername = decoded.adminUser;

    // Get admin user info
    const users = await execHestiaJson('v-list-user', [adminUsername]);
    const userData = users[adminUsername];

    if (!userData) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    // Generate new admin token
    const newToken = generateToken({
      USER: adminUsername,
      ROLE: userData.ROLE || 'admin',
      NAME: userData.NAME
    });

    res.cookie('token', newToken, {
      httpOnly: true,
      secure: true,
      sameSite: 'strict',
      maxAge: 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      user: {
        username: adminUsername,
        name: userData.NAME,
        email: userData.CONTACT,
        role: userData.ROLE || 'admin'
      }
    });
  } catch (error) {
    console.error('Return to admin error:', error);
    res.status(500).json({ error: 'Failed to return to admin' });
  }
});

/**
 * GET /api/auth/me
 * Get current user info
 */
router.get('/me', async (req, res) => {
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Not authenticated' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid token' });
  }

  try {
    const users = await execHestiaJson('v-list-user', [decoded.user]);
    const userData = users[decoded.user];

    if (!userData) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check 2FA status
    const twoFAConfig = load2FA(decoded.user);

    res.json({
      user: {
        username: decoded.user,
        name: userData.NAME,
        email: userData.CONTACT,
        role: decoded.role,
        twoFactorEnabled: !!twoFAConfig?.enabled
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

/**
 * GET /api/auth/2fa/status
 * Get 2FA status for current user
 */
router.get('/2fa/status', authMiddleware, async (req, res) => {
  try {
    const twoFAConfig = load2FA(req.user.user);
    res.json({
      enabled: !!twoFAConfig?.enabled,
      backupCodesRemaining: twoFAConfig?.backupCodes?.length || 0
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get 2FA status' });
  }
});

/**
 * POST /api/auth/2fa/setup
 * Initialize 2FA setup - returns secret and QR code
 */
router.post('/2fa/setup', authMiddleware, async (req, res) => {
  try {
    const username = req.user.user;
    
    // Generate secret
    const secret = authenticator.generateSecret();
    
    // Generate OTP Auth URL
    const otpauth = authenticator.keyuri(username, 'VHestiaCP', secret);
    
    // Generate QR Code as data URL
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);
    
    // Generate backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    
    // Save pending setup (not yet enabled)
    save2FA(username, {
      secret,
      enabled: false,
      backupCodes,
      createdAt: new Date().toISOString()
    });
    
    res.json({
      secret,
      qrCode: qrCodeDataUrl,
      backupCodes
    });
  } catch (error) {
    console.error('2FA setup error:', error);
    res.status(500).json({ error: 'Failed to setup 2FA' });
  }
});

/**
 * POST /api/auth/2fa/verify
 * Verify TOTP code and enable 2FA
 */
router.post('/2fa/verify', authMiddleware, async (req, res) => {
  try {
    const username = req.user.user;
    const { code } = req.body;
    
    if (!code) {
      return res.status(400).json({ error: 'Verification code required' });
    }
    
    const twoFAConfig = load2FA(username);
    if (!twoFAConfig?.secret) {
      return res.status(400).json({ error: '2FA setup not initiated' });
    }
    
    const isValid = authenticator.verify({ token: code, secret: twoFAConfig.secret });
    if (!isValid) {
      return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    // Enable 2FA
    twoFAConfig.enabled = true;
    twoFAConfig.enabledAt = new Date().toISOString();
    save2FA(username, twoFAConfig);
    
    res.json({ success: true, message: 'Two-factor authentication enabled' });
  } catch (error) {
    console.error('2FA verify error:', error);
    res.status(500).json({ error: 'Failed to verify 2FA' });
  }
});

/**
 * DELETE /api/auth/2fa
 * Disable 2FA
 */
router.delete('/2fa', authMiddleware, async (req, res) => {
  try {
    const username = req.user.user;
    const { password } = req.body;
    
    // Verify password before disabling 2FA
    if (!password) {
      return res.status(400).json({ error: 'Password required to disable 2FA' });
    }
    
    try {
      execSync(`/usr/local/vhestia/bin/v-check-user-password '${username}' '${password}'`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    delete2FA(username);
    
    res.json({ success: true, message: 'Two-factor authentication disabled' });
  } catch (error) {
    console.error('2FA disable error:', error);
    res.status(500).json({ error: 'Failed to disable 2FA' });
  }
});

/**
 * POST /api/auth/2fa/regenerate-backup
 * Regenerate backup codes
 */
router.post('/2fa/regenerate-backup', authMiddleware, async (req, res) => {
  try {
    const username = req.user.user;
    const { password } = req.body;
    
    if (!password) {
      return res.status(400).json({ error: 'Password required' });
    }
    
    try {
      execSync(`/usr/local/vhestia/bin/v-check-user-password '${username}' '${password}'`, {
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
    } catch (err) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const twoFAConfig = load2FA(username);
    if (!twoFAConfig?.enabled) {
      return res.status(400).json({ error: '2FA not enabled' });
    }
    
    // Generate new backup codes
    const backupCodes = [];
    for (let i = 0; i < 10; i++) {
      backupCodes.push(Math.random().toString(36).substring(2, 10).toUpperCase());
    }
    
    twoFAConfig.backupCodes = backupCodes;
    save2FA(username, twoFAConfig);
    
    res.json({ backupCodes });
  } catch (error) {
    console.error('Regenerate backup codes error:', error);
    res.status(500).json({ error: 'Failed to regenerate backup codes' });
  }
});

export default router;
