module.exports = {
  apps: [{
    name: 'arvemart',
    script: 'node_modules/.bin/next',
    args: 'start',
    cwd: '/www/wwwroot/arvemart',
    instances: 1,
    exec_mode: 'fork',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
    },
    max_memory_restart: '400M',
  }]
}