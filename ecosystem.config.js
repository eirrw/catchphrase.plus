module.exports = {
  apps : [{
    name: 'catchphrase.plus',
    script: 'app.js',
    watch: 'app.js,server/game.js',
    autorestart: true,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production'
    }
  }]
};
