module.exports = {
  apps: [
    {
      name: 'vhestia-panel',
      cwd: './server',
      script: 'src/index.js',
      node_args: '--experimental-modules',
      instances: 'max',
      exec_mode: 'cluster',
      autorestart: true,
      watch: false,
      max_memory_restart: '256M',
      env: {
        NODE_ENV: 'production',
        PORT: 8083,
        HESTIA: '/usr/local/hestia',
        SSL_KEY: '/usr/local/hestia/ssl/certificate.key',
        SSL_CERT: '/usr/local/hestia/ssl/certificate.crt'
      }
    }
  ]
};
