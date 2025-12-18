// PM2 Ecosystem Configuration File
// Use this to manage your Node.js application on Hostinger VPS
// Run with: pm2 start ecosystem.config.js

module.exports = {
  apps: [{
    name: 'student-itrack-api',
    script: './src/server.js',
    instances: 1, // Use 1 for small VPS, increase for larger servers
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 5000
    },
    // Logging
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Auto-restart settings
    max_memory_restart: '500M', // Restart if memory exceeds 500MB
    min_uptime: '10s', // Minimum uptime before considering app stable
    max_restarts: 10, // Maximum restarts in 1 minute
    
    // Watch mode (disable in production)
    watch: false,
    
    // Ignore watch patterns
    ignore_watch: [
      'node_modules',
      'logs',
      '.git'
    ],
    
    // Environment variables (override with .env file)
    env_file: '.env'
  }]
}



