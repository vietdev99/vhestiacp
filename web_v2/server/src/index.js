import https from 'https';
import fs from 'fs';
import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import systemRoutes from './routes/system.js';
import webRoutes from './routes/web.js';
import packageRoutes from './routes/packages.js';
import quickinstallRoutes from './routes/quickinstall.js';
import servicesRoutes from './routes/services.js';
import dnsRoutes from './routes/dns.js';
import cronRoutes from './routes/cron.js';
import databasesRoutes from './routes/databases.js';
import mongodbRoutes from './routes/mongodb.js';
import firewallRoutes from './routes/firewall.js';
import haproxyRoutes from './routes/haproxy.js';
import rcloneRoutes from './routes/rclone.js';
import mariadbRoutes from './routes/mariadb.js';
import pgsqlRoutes from './routes/pgsql.js';
import filesRoutes from './routes/files.js';
import statsRoutes from './routes/stats.js';
import pm2Routes from './routes/pm2.js';
import backupsRoutes from './routes/backups.js';
import mailRoutes from './routes/mail.js';
import { authMiddleware } from './middleware/auth.js';

const app = express();
const PORT = process.env.PORT || 8083;
const HESTIA_DIR = process.env.HESTIA || '/usr/local/hestia';

// SSL certificates (use Hestia's certificates)
const sslOptions = {
  key: fs.readFileSync(process.env.SSL_KEY || '/usr/local/hestia/ssl/certificate.key'),
  cert: fs.readFileSync(process.env.SSL_CERT || '/usr/local/hestia/ssl/certificate.crt')
};

// Middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for SPA
}));
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // limit each IP to 1000 requests per windowMs
  message: { error: 'Too many requests, please try again later.' }
});
app.use('/api/', limiter);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', authMiddleware, userRoutes);
app.use('/api/system', authMiddleware, systemRoutes);
app.use('/api/web', authMiddleware, webRoutes);
app.use('/api/packages', authMiddleware, packageRoutes);
app.use('/api/quickinstall', authMiddleware, quickinstallRoutes);
app.use('/api/services', authMiddleware, servicesRoutes);
app.use('/api/dns', authMiddleware, dnsRoutes);
app.use('/api/cron', authMiddleware, cronRoutes);
app.use('/api/databases', authMiddleware, databasesRoutes);
app.use('/api/mongodb', authMiddleware, mongodbRoutes);
app.use('/api/firewall', authMiddleware, firewallRoutes);
app.use('/api/haproxy', authMiddleware, haproxyRoutes);
app.use('/api/rclone', authMiddleware, rcloneRoutes);
app.use('/api/mariadb', authMiddleware, mariadbRoutes);
app.use('/api/pgsql', authMiddleware, pgsqlRoutes);
app.use('/api/files', authMiddleware, filesRoutes);
app.use('/api/stats', authMiddleware, statsRoutes);
app.use('/api/pm2', authMiddleware, pm2Routes);
app.use('/api/backups', authMiddleware, backupsRoutes);
app.use('/api/mail', authMiddleware, mailRoutes);

// Serve React static files in production
const clientPath = path.join(path.dirname(new URL(import.meta.url).pathname), '../../client/dist');
if (fs.existsSync(clientPath)) {
  app.use(express.static(clientPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientPath, 'index.html'));
  });
}

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

// Start HTTPS server
https.createServer(sslOptions, app).listen(PORT, () => {
  console.log(`VHestiaCP Panel v2 running on https://localhost:${PORT}`);
});
