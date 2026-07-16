module.exports = {
  apps: [
    {
      name: 'arvemart',
      script: '.next/standalone/server.js',
      cwd: '/www/wwwroot/arvemart',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      max_memory_restart: '400M',
    },
    {
      name: 'wa-engine',
      script: 'server.js',
      cwd: '/www/wwwroot/arvemart/storage/app/wa-engine',
      instances: 1,
      exec_mode: 'fork',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
      max_memory_restart: '400M',
    }
  ]
}