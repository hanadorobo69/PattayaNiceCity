// PM2 Ecosystem config — manages all your apps
// Usage: pm2 start ecosystem.config.js
// Docs: https://pm2.keymetrics.io/docs/usage/application-declaration/

module.exports = {
  apps: [
    {
      name: "pattayavicecity",
      cwd: "/var/www/pattayavicecity",
      script: "node_modules/.bin/next",
      args: "start -p 3000",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      instances: 1,            // 1 instance per app is fine
      autorestart: true,       // auto-restart on crash
      max_memory_restart: "512M",
      log_date_format: "YYYY-MM-DD HH:mm:ss",
      error_file: "/home/deploy/logs/pattaya-error.log",
      out_file: "/home/deploy/logs/pattaya-out.log",
    },
    // Uncomment and duplicate for your other apps:
    // {
    //   name: "dating-app-1",
    //   cwd: "/var/www/dating-app-1",
    //   script: "node_modules/.bin/next",
    //   args: "start -p 3001",
    //   env: { NODE_ENV: "production", PORT: 3001 },
    //   instances: 1,
    //   autorestart: true,
    //   max_memory_restart: "512M",
    //   error_file: "/home/deploy/logs/dating1-error.log",
    //   out_file: "/home/deploy/logs/dating1-out.log",
    // },
    // {
    //   name: "dating-app-2",
    //   cwd: "/var/www/dating-app-2",
    //   script: "node_modules/.bin/next",
    //   args: "start -p 3002",
    //   env: { NODE_ENV: "production", PORT: 3002 },
    //   instances: 1,
    //   autorestart: true,
    //   max_memory_restart: "512M",
    //   error_file: "/home/deploy/logs/dating2-error.log",
    //   out_file: "/home/deploy/logs/dating2-out.log",
    // },
  ],
}
