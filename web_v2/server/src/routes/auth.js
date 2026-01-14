import { Router } from 'express';
import { execSync } from 'child_process';
import { generateToken, verifyToken } from '../middleware/auth.js';
import { execHestiaJson } from '../utils/hestia.js';

const router = Router();

/**
 * POST /api/auth/login
 * Login with username and password (same as v1)
 */
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    // Validate credentials using Hestia's v-check-user-password
    try {
      execSync(`/usr/local/hestia/bin/v-check-user-password '${username}' '${password}'`, {
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
        role: userData.ROLE || (username === 'admin' ? 'admin' : 'user')
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

    res.json({
      user: {
        username: decoded.user,
        name: userData.NAME,
        email: userData.CONTACT,
        role: decoded.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

export default router;
