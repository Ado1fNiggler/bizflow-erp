module.exports = {
  apps: [{
    name: 'bizflow-api',
    script: 'server.js',
    instances: 'max',
    exec_mode: 'cluster',
    watch: false,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024',
    env: {
      NODE_ENV: 'development',
      PORT: 5000
    },
    env_staging: {
      NODE_ENV: 'staging',
      PORT: 5000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    error_file: './logs/pm2/err.log',
    out_file: './logs/pm2/out.log',
    log_file: './logs/pm2/combined.log',
    time: true,
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000,
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s',
    post_update: ['npm install', 'npm run migrate'],
    ignore_watch: [
      'node_modules',
      'logs',
      'uploads',
      'backups',
      'coverage',
      'tests',
      '.git'
    ],
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};