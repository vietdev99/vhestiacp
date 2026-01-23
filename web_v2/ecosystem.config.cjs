// Auto-detect HESTIA path from environment or use default
const fs = require('fs');
const HESTIA_PATH = process.env.HESTIA || process.env.VHESTIA ||
  (fs.existsSync('/usr/local/hestia') ? '/usr/local/hestia' : '/usr/local/vhestia');

module.exports = {
  apps: [
    {
      name: 'vhestia-panel',
      cwd: './server',
      script: 'src/index.js',
      node_args: '--experimental-modules',
      instances: 1,
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 8083,
        // VHestiaCP paths - auto-detected, set both for compatibility
        VHESTIA: HESTIA_PATH,
        HESTIA: HESTIA_PATH,
        SSL_KEY: `${HESTIA_PATH}/ssl/certificate.key`,
        SSL_CERT: `${HESTIA_PATH}/ssl/certificate.crt`
      }
    }
  ]
};
