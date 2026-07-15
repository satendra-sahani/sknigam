// PM2 process definitions for the Pollistics VPS.
// Usage on the server (from the repo root):
//   pm2 start deploy/ecosystem.config.js
//   pm2 save && pm2 startup   # survive reboots
//
// Env files live next to this file (deploy/api.env, deploy/web.env) and are
// gitignored. Copy the *.env.example templates and fill in real values first.
module.exports = {
  apps: [
    {
      name: 'pollistics-api',
      cwd: './packages/api',
      script: 'npm',
      args: 'start',            // -> ts-node src/server.ts (port from PORT / 9003)
      env_file: '../../deploy/api.env',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '600M',
      time: true,
    },
    {
      name: 'pollistics-web',
      cwd: './packages/web',
      script: 'npm',
      args: 'start',            // -> next start (set PORT in web.env, e.g. 3004)
      env_file: '../../deploy/web.env',
      env: { NODE_ENV: 'production' },
      max_memory_restart: '600M',
      time: true,
    },
  ],
};
