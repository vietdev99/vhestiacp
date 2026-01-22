import jwt from 'jsonwebtoken';
import fs from 'fs';
import crypto from 'crypto';

// Use Hestia's secret key or generate one
let JWT_SECRET = process.env.JWT_SECRET || 'vhestia-secret-key';
try {
  const keyPath = '/usr/local/vhestia/data/sessions/key';
  if (fs.existsSync(keyPath)) {
    JWT_SECRET = fs.readFileSync(keyPath, 'utf8').trim();
  } else {
    // Generate and save a new key
    JWT_SECRET = crypto.randomBytes(32).toString('hex');
    fs.mkdirSync('/usr/local/vhestia/data/sessions', { recursive: true });
    fs.writeFileSync(keyPath, JWT_SECRET, { mode: 0o600 });
  }
} catch (e) {
  console.warn('Could not load/create session key, using default');
}
const JWT_EXPIRES = '24h';

/**
 * Generate JWT token
 */
export function generateToken(user) {
  const payload = {
    user: user.USER,
    role: user.ROLE || 'user',
    name: user.NAME
  };

  // Include admin user if this is a login-as session
  if (user.ADMIN_USER) {
    payload.adminUser = user.ADMIN_USER;
  }

  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

/**
 * Verify JWT token
 */
export function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

/**
 * Auth middleware - check if user is authenticated
 */
export function authMiddleware(req, res, next) {
  // Get token from cookie or header
  const token = req.cookies.token || req.headers.authorization?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }

  req.user = decoded;
  next();
}

/**
 * Admin middleware - check if user is admin
 */
export function adminMiddleware(req, res, next) {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

export { JWT_SECRET };
